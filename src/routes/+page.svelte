<script lang="ts">
  import type { PageData } from './$types';
  import * as Card from '$lib/components/ui/card';
  import * as Table from '$lib/components/ui/table';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Select from '$lib/components/ui/select';
  import { treaty } from '@elysiajs/eden';
  import type { App } from '$lib/server/api';
  import { invalidateAll } from '$app/navigation';

  let { data }: { data: PageData } = $props();
  let dialogOpen = $state(false);
  let loading = $state(false);

  let formData = $state({
    amount: '',
    type: 'expense',
    description: '',
    categoryId: '1',
    date: new Date().toISOString().slice(0, 10)
  });

  let totalIncome = $derived(data.transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0));
  let totalExpense = $derived(data.transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0));
  let balance = $derived(totalIncome - totalExpense);

  async function submitTransaction(e: Event) {
    e.preventDefault();
    loading = true;
    const api = treaty<App>(window.location.origin);
    const { data: res, error } = await api.api.transactions.post({
      amount: Number(formData.amount),
      type: formData.type as 'income' | 'expense',
      categoryId: Number(formData.categoryId),
      description: formData.description,
      date: formData.date
    });
    
    loading = false;
    if (!error) {
      dialogOpen = false;
      invalidateAll(); // refresh data
      formData = { amount: '', type: 'expense', description: '', categoryId: '1', date: new Date().toISOString().slice(0, 10) };
    } else {
      alert('Gagal menambah transaksi');
    }
  }
</script>

<div class="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 p-6">
  <div class="max-w-5xl mx-auto space-y-8">
    <header class="flex justify-between items-center">
      <h1 class="text-3xl font-bold tracking-tight bg-white">Arus Kas</h1>
      <Dialog.Root bind:open={dialogOpen}>
        <Dialog.Trigger>
          <Button>Tambah Transaksi</Button>
        </Dialog.Trigger>
        <Dialog.Content class="sm:max-w-[425px]">
          <Dialog.Header>
            <Dialog.Title>Transaksi Baru</Dialog.Title>
            <Dialog.Description>Masukkan detail pemasukan atau pengeluaran baru.</Dialog.Description>
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
    </header>

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
      <Card.Header>
        <Card.Title>Riwayat Transaksi</Card.Title>
        <Card.Description>Daftar transaksi terbaru bulan ini.</Card.Description>
      </Card.Header>
      <Card.Content>
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Tanggal</Table.Head>
              <Table.Head>Deskripsi</Table.Head>
              <Table.Head>Tipe</Table.Head>
              <Table.Head class="text-right">Jumlah</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each data.transactions as tx}
              <Table.Row>
                <Table.Cell>{new Date(tx.date).toLocaleDateString('id-ID')}</Table.Cell>
                <Table.Cell>{tx.description}</Table.Cell>
                <Table.Cell>
                  <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold {tx.type === 'income' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}">
                    {tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                  </span>
                </Table.Cell>
                <Table.Cell class="text-right {tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                  {tx.type === 'income' ? '+' : '-'} Rp {tx.amount.toLocaleString('id-ID')}
                </Table.Cell>
              </Table.Row>
            {/each}
            {#if data.transactions.length === 0}
              <Table.Row>
                <Table.Cell colspan={4} class="h-24 text-center">Belum ada transaksi.</Table.Cell>
              </Table.Row>
            {/if}
          </Table.Body>
        </Table.Root>
      </Card.Content>
    </Card.Root>
  </div>
</div>
