<script lang="ts">
  import type { PageData } from './$types';
  import * as Card from '$lib/components/ui/card';
  import * as Table from '$lib/components/ui/table';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Dialog from '$lib/components/ui/dialog';
  import { getApi } from '$lib/api';
  import { invalidateAll } from '$app/navigation';

  let { data }: { data: PageData } = $props();
  let dialogOpen = $state(false);
  let loading = $state(false);

  let formData = $state({
    username: '',
    password: '',
    branchId: ''
  });

  async function submitUser(e: Event) {
    e.preventDefault();
    loading = true;
    const api = getApi(window.location.origin, data.csrfToken);
    
    // if branchId is empty string, we pass null
    const payloadBranchId = formData.branchId === '' ? null : Number(formData.branchId);

    const { error } = await api.api.users.post({
      username: formData.username,
      password: formData.password,
      branchId: payloadBranchId
    });
    
    loading = false;
    if (!error) {
      dialogOpen = false;
      invalidateAll();
      formData = { username: '', password: '', branchId: '' };
    } else {
      alert(error.value || 'Gagal menambah pengguna');
    }
  }

  async function deleteUser(id: number) {
    if (!confirm('Hapus pengguna ini?')) return;
    const api = getApi(window.location.origin, data.csrfToken);
    const { error } = await api.api.users({ id }).delete();
    if (!error) {
      invalidateAll();
    } else {
      alert(error.value || 'Gagal menghapus pengguna');
    }
  }
</script>

<div class="max-w-5xl mx-auto space-y-8 p-6 pt-10">
  <div class="flex justify-between items-center mb-6">
    <h2 class="text-2xl font-bold tracking-tight">Manajemen Pengguna</h2>
    <Dialog.Root bind:open={dialogOpen}>
      <Dialog.Trigger>
        <Button>Tambah Pengguna</Button>
      </Dialog.Trigger>
      <Dialog.Content class="sm:max-w-[425px]">
        <Dialog.Header>
          <Dialog.Title>Pengguna Baru</Dialog.Title>
          <Dialog.Description>Buat akun kasir atau superadmin baru.</Dialog.Description>
        </Dialog.Header>
        <form onsubmit={submitUser} class="space-y-4 py-4">
          <div class="space-y-2">
            <Label for="username">Username</Label>
            <Input id="username" type="text" bind:value={formData.username} required placeholder="kasir_pusat" />
          </div>
          <div class="space-y-2">
            <Label for="password">Password</Label>
            <Input id="password" type="password" bind:value={formData.password} required placeholder="minimal 6 karakter" minlength={6} />
          </div>
          <div class="space-y-2">
            <Label for="branch">Akses Cabang</Label>
            <select id="branch" bind:value={formData.branchId} class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
              <option value="">-- Semua Cabang (Superadmin) --</option>
              {#each data.branches as branch}
                <option value={(branch as { id: number }).id.toString()}>{(branch as { name: string }).name}</option>
              {/each}
            </select>
          </div>
          <div class="flex justify-end pt-4">
            <Button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan Pengguna'}</Button>
          </div>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  </div>

  <Card.Root>
    <Card.Header>
      <Card.Title>Daftar Pengguna</Card.Title>
    </Card.Header>
    <Card.Content>
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>ID</Table.Head>
            <Table.Head>Username</Table.Head>
            <Table.Head>Peran / Cabang</Table.Head>
            <Table.Head class="w-[80px]"></Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each data.usersList as u}
            <Table.Row>
              <Table.Cell>{(u as { id: number }).id}</Table.Cell>
              <Table.Cell class="font-medium">{(u as { username: string }).username}</Table.Cell>
              <Table.Cell>
                {#if (u as { branchId: number | null }).branchId === null}
                  <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                    Superadmin
                  </span>
                {:else}
                  <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                    {(u as { branchName: string }).branchName || `Cabang ${(u as { branchId: number }).branchId}`}
                    {#if (u as { branchLocation: string }).branchLocation}
                      - {(u as { branchLocation: string }).branchLocation}
                    {/if}
                  </span>
                {/if}
              </Table.Cell>
              <Table.Cell>
                {#if data.user?.id !== (u as { id: number }).id}
                  <Button variant="ghost" size="sm" class="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950" onclick={() => deleteUser((u as { id: number }).id)}>Hapus</Button>
                {/if}
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </Card.Content>
  </Card.Root>
</div>
