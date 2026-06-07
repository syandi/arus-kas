<script lang="ts">
  import type { PageData } from './$types';
  import * as Card from '$lib/components/ui/card';
  import * as Table from '$lib/components/ui/table';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Select from '$lib/components/ui/select';
  import { getApi } from '$lib/api';
  import { invalidateAll } from '$app/navigation';

  let { data }: { data: PageData } = $props();
  let dialogOpen = $state(false);
  let loading = $state(false);

  let aiDialogOpen = $state(false);
  let aiLoading = $state(false);
  let chatHistory = $state<{role: string, content: string}[]>([]);
  let chatInput = $state('');

  function toLocalISODate(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  let formData = $state({
    id: null as number | null,
    amount: '',
    type: 'expense',
    description: '',
    categoryId: '',
    branchId: '',
    date: toLocalISODate(new Date())
  });

  let filteredCategories = $derived(
    (data.categories as any[]).filter(c => c.type === formData.type)
  );

  $effect(() => {
    if (data.branches && data.branches.length > 0 && formData.branchId === '') {
      formData.branchId = (data.branches[0] as { id: number }).id.toString();
    }
    // Auto select first category when type changes or initially
    if (filteredCategories.length > 0 && !filteredCategories.find(c => c.id.toString() === formData.categoryId)) {
      formData.categoryId = filteredCategories[0].id.toString();
    }
  });

  let filterBranchId = $state('');
  
  // Set default dates to first day of current month and today
  const today = new Date();
  const firstDay = toLocalISODate(new Date(today.getFullYear(), today.getMonth(), 1));
  const todayDate = toLocalISODate(today);
  
  let filterStartDate = $state(firstDay);
  let filterEndDate = $state(todayDate);
  let searchQuery = $state('');
  let filterType = $state('all');

  let filteredTransactions = $derived(
    (data.transactions as any[]).filter(t => {
      const matchBranch = filterBranchId === '' || t.branchId.toString() === filterBranchId;
      const tDate = toLocalISODate(new Date(t.date));
      const matchStart = filterStartDate === '' || tDate >= filterStartDate;
      const matchEnd = filterEndDate === '' || tDate <= filterEndDate;
      const matchSearch = searchQuery === '' || t.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = filterType === 'all' || t.type === filterType;
      return matchBranch && matchStart && matchEnd && matchSearch && matchType;
    })
  );

  let totalIncome = $derived((filteredTransactions as any[]).filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0));
  let totalExpense = $derived((filteredTransactions as any[]).filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0));
  let balance = $derived(totalIncome - totalExpense);

  async function submitTransaction(e: Event) {
    e.preventDefault();
    loading = true;
    const api = getApi(window.location.origin, data.csrfToken);
    
    const payload = {
      amount: Number(formData.amount),
      type: formData.type as 'income' | 'expense',
      categoryId: Number(formData.categoryId),
      branchId: Number(formData.branchId),
      description: formData.description,
      date: formData.date
    };

    let error;
    if (formData.id) {
      const res = await api.api.transactions({ id: formData.id }).put(payload);
      error = res.error;
    } else {
      const res = await api.api.transactions.post(payload);
      error = res.error;
    }
    
    loading = false;
    if (!error) {
      dialogOpen = false;
      invalidateAll(); // refresh data
      formData = { id: null, amount: '', type: 'expense', description: '', categoryId: '1', branchId: '', date: toLocalISODate(new Date()) };
    } else {
      alert(formData.id ? 'Gagal mengubah transaksi' : 'Gagal menambah transaksi');
    }
  }

  function editTransaction(tx: any) {
    formData = {
      id: tx.id,
      amount: tx.amount.toString(),
      type: tx.type,
      description: tx.description,
      categoryId: tx.categoryId.toString(),
      branchId: tx.branchId.toString(),
      date: toLocalISODate(new Date(tx.date))
    };
    dialogOpen = true;
  }

  async function deleteTransaction(id: number) {
    if (!confirm('Hapus transaksi ini?')) return;
    const api = getApi(window.location.origin, data.csrfToken);
    const { error } = await api.api.transactions({ id }).delete();
    if (!error) {
      invalidateAll();
    } else {
      alert('Gagal menghapus transaksi');
    }
  }

  async function handleLogout() {
    await fetch('/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  function openAIChat() {
    aiDialogOpen = true;
    if (chatHistory.length === 0) {
      chatHistory = [
        { role: 'assistant', content: 'Halo! Saya Asisten ArusKas AI. Berdasarkan data transaksi Anda saat ini, ada yang bisa saya bantu analisa atau hitung?' }
      ];
    }
  }

  async function sendChatMessage(e?: Event) {
    if (e) e.preventDefault();
    if (!chatInput.trim() || aiLoading) return;

    const userMessage = chatInput.trim();
    chatInput = '';
    chatHistory = [...chatHistory, { role: 'user', content: userMessage }];
    aiLoading = true;
    
    // Convert history for API (filter out the first greeting if needed, but it's fine to send it as 'assistant' so llama3 has context)
    // Cloudflare AI uses 'system', 'user', 'assistant' roles
    const apiMessages = chatHistory.filter(m => m.role === 'user' || m.role === 'assistant');

    const api = getApi(window.location.origin, data.csrfToken);
    const res = await api.api.ai.chat.post({
      branchId: filterBranchId || undefined,
      messages: apiMessages
    });
    
    aiLoading = false;
    if (!res.error) {
      chatHistory = [...chatHistory, { role: 'assistant', content: (res.data as any).response }];
    } else {
      chatHistory = [...chatHistory, { role: 'assistant', content: 'Maaf, gagal memproses respons AI: ' + JSON.stringify(res.error) }];
    }
  }
</script>

<div class="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 p-6">
  <div class="max-w-5xl mx-auto space-y-8">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold tracking-tight">Transaksi</h2>
      <Dialog.Root bind:open={dialogOpen}>
        <Dialog.Trigger>
          <Button>+ Baru</Button>
        </Dialog.Trigger>
        <Dialog.Content class="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <Dialog.Header>
            <Dialog.Title>{formData.id ? 'Edit Transaksi' : 'Transaksi Baru'}</Dialog.Title>
            <Dialog.Description>Masukkan detail pemasukan atau pengeluaran.</Dialog.Description>
          </Dialog.Header>
          <form onsubmit={submitTransaction} class="space-y-4 py-4">
            <div class="space-y-2">
              <Label for="type">Tipe</Label>
              <select id="type" bind:value={formData.type} class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <option value="income">Pemasukan</option>
                <option value="expense">Pengeluaran</option>
              </select>
            </div>
            <div class="space-y-2">
              <Label for="category">Kategori</Label>
              <select id="category" bind:value={formData.categoryId} required class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                {#each filteredCategories as category}
                  <option value={(category as { id: number }).id.toString()}>{(category as { name: string }).name}</option>
                {/each}
              </select>
            </div>
            {#if data.user?.branchId === null}
            <div class="space-y-2">
              <Label for="branch">Cabang</Label>
              <select id="branch" bind:value={formData.branchId} required disabled={data.user?.branchId !== null} class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <option value="" disabled selected>Pilih Cabang</option>
                {#each data.branches as branch}
                  <option value={(branch as { id: number }).id.toString()}>{(branch as { name: string }).name}</option>
                {/each}
              </select>
            </div>
            {/if}
            <div class="space-y-2">
              <Label for="amount">Jumlah (Rp)</Label>
              <Input id="amount" type="number" bind:value={formData.amount} required placeholder="50000" />
            </div>
            <div class="space-y-2">
              <Label for="desc">Deskripsi</Label>
              <Input id="desc" type="text" bind:value={formData.description} required placeholder="Beli Makan Siang" />
            </div>
            <div class="space-y-2">
              <Label for="date">Tanggal</Label>
              <Input id="date" type="date" bind:value={formData.date} required />
            </div>
            <div class="flex justify-end pt-4">
              <Button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan Transaksi'}</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Root>
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <Card.Root>
        <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
          <Card.Title class="text-sm font-medium">Total Pemasukan</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="text-2xl font-bold text-green-600 dark:text-green-400">Rp {totalIncome.toLocaleString('id-ID')}</div>
        </Card.Content>
      </Card.Root>
      <Card.Root>
        <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
          <Card.Title class="text-sm font-medium">Total Pengeluaran</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="text-2xl font-bold text-red-600 dark:text-red-400">Rp {totalExpense.toLocaleString('id-ID')}</div>
        </Card.Content>
      </Card.Root>
      <Card.Root>
        <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
          <Card.Title class="text-sm font-medium">Saldo Saat Ini</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="text-2xl font-bold">Rp {balance.toLocaleString('id-ID')}</div>
        </Card.Content>
      </Card.Root>
    </div>

    <Card.Root>
      <Card.Header class="space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <Card.Title>Riwayat Transaksi</Card.Title>
            <Card.Description>Daftar transaksi berdasarkan filter.</Card.Description>
          </div>
          <Button class="gap-2 bg-linear-to-r from-indigo-500 to-purple-600 text-white border-0 hover:from-indigo-600 hover:to-purple-700 shadow-md transition-all hover:scale-105" onclick={openAIChat}>
            ✨ Asisten AI
          </Button>
        </div>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-center gap-2">
            {#if data.user?.branchId === null}
              <Label for="filterBranch" class="text-sm font-medium">Cabang:</Label>
              <select id="filterBranch" bind:value={filterBranchId} class="flex h-9 w-40 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="">Semua Cabang</option>
                {#each data.branches as branch}
                  <option value={(branch as { id: number }).id.toString()}>{(branch as { name: string }).name}</option>
                {/each}
              </select>
            {/if}
          </div>
          <div class="flex flex-wrap items-center gap-4">
            <div class="flex items-center gap-2">
              <Label for="startDate" class="text-sm font-medium">Dari:</Label>
              <Input id="startDate" type="date" bind:value={filterStartDate} class="h-9 w-36" />
            </div>
            <div class="flex items-center gap-2">
              <Label for="endDate" class="text-sm font-medium">Sampai:</Label>
              <Input id="endDate" type="date" bind:value={filterEndDate} class="h-9 w-36" />
            </div>
          </div>
        </div>
        <div class="flex flex-col sm:flex-row gap-4 mt-2">
          <div class="flex-1">
            <Input type="text" placeholder="Cari deskripsi transaksi..." bind:value={searchQuery} class="h-9 w-full" />
          </div>
          <div class="flex-shrink-0">
            <select bind:value={filterType} class="flex h-9 w-full sm:w-40 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="all">Semua Tipe</option>
              <option value="income">Pemasukan</option>
              <option value="expense">Pengeluaran</option>
            </select>
          </div>
        </div>
      </Card.Header>
      <Card.Content>
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Tanggal</Table.Head>
              <Table.Head>Deskripsi</Table.Head>
              <Table.Head>Tipe</Table.Head>
              <Table.Head>Dibuat Oleh</Table.Head>
              <Table.Head class="text-right">Jumlah</Table.Head>
              <Table.Head class="w-[80px]"></Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each filteredTransactions as tx}
              <Table.Row>
                <Table.Cell>{new Date((tx as { date: Date }).date).toLocaleDateString('id-ID')}</Table.Cell>
                <Table.Cell>{(tx as { description: string }).description}</Table.Cell>
                <Table.Cell>
                  <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold {((tx as { type: 'income' | 'expense' }).type === 'income' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300')}">
                    {(tx as { type: 'income' | 'expense' }).type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                  </span>
                </Table.Cell>
                <Table.Cell class="text-xs text-zinc-500">
                  @{(tx as { author: string }).author || 'Sistem'}
                </Table.Cell>
                <Table.Cell class="text-right {((tx as { type: 'income' | 'expense' }).type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}">
                  {((tx as { type: 'income' | 'expense' }).type === 'income' ? '+' : '-')} Rp {((tx as { amount: number }).amount).toLocaleString('id-ID')}
                </Table.Cell>
                <Table.Cell>
                  <div class="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" class="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950 px-2" onclick={() => editTransaction(tx)}>Edit</Button>
                    <Button variant="ghost" size="sm" class="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 px-2" onclick={() => deleteTransaction((tx as { id: number }).id)}>Hapus</Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            {/each}
            {#if filteredTransactions.length === 0}
              <Table.Row>
                <Table.Cell colspan={6} class="h-24 text-center">Belum ada transaksi.</Table.Cell>
              </Table.Row>
            {/if}
          </Table.Body>
        </Table.Root>
      </Card.Content>
    </Card.Root>
  </div>
</div>

<Dialog.Root bind:open={aiDialogOpen}>
  <Dialog.Content class="sm:max-w-[600px] max-h-[85vh] flex flex-col p-0 overflow-hidden">
    <div class="p-6 border-b">
      <Dialog.Title class="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
        ✨ Asisten Keuangan Llama 3.1
      </Dialog.Title>
      <Dialog.Description>Asisten pintar yang mengetahui konteks transaksi cabang Anda.</Dialog.Description>
    </div>
    <div class="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-50/50 dark:bg-zinc-900/50">
      {#each chatHistory as msg}
        <div class="flex {msg.role === 'user' ? 'justify-end' : 'justify-start'}">
          <div class="max-w-[85%] rounded-2xl px-4 py-3 {msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white dark:bg-zinc-800 border shadow-sm rounded-tl-sm'}">
            <div class="prose prose-sm max-w-none whitespace-pre-wrap {msg.role === 'user' ? 'text-white' : 'dark:text-zinc-200'}">
              {msg.content}
            </div>
          </div>
        </div>
      {/each}
      {#if aiLoading}
        <div class="flex justify-start">
          <div class="bg-white dark:bg-zinc-800 border shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
            <div class="animate-bounce h-2 w-2 bg-zinc-400 rounded-full"></div>
            <div class="animate-bounce h-2 w-2 bg-zinc-400 rounded-full" style="animation-delay: 0.2s"></div>
            <div class="animate-bounce h-2 w-2 bg-zinc-400 rounded-full" style="animation-delay: 0.4s"></div>
          </div>
        </div>
      {/if}
    </div>
    <div class="p-4 bg-white dark:bg-zinc-950 border-t">
      <form onsubmit={sendChatMessage} class="flex gap-2">
        <Input type="text" bind:value={chatInput} placeholder="Tanya tentang arus kas..." class="flex-1 rounded-full px-4" disabled={aiLoading} />
        <Button type="submit" disabled={!chatInput.trim() || aiLoading} class="rounded-full px-6 bg-indigo-600 hover:bg-indigo-700 text-white">
          Kirim
        </Button>
      </form>
      <p class="text-[10px] text-center text-zinc-400 mt-2">AI dapat memberikan informasi yang tidak akurat. Harap verifikasi kalkulasinya.</p>
    </div>
  </Dialog.Content>
</Dialog.Root>
