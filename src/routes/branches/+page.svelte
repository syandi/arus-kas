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
    name: '',
    location: ''
  });

  async function submitBranch(e: Event) {
    e.preventDefault();
    loading = true;
    const api = getApi(window.location.origin, data.csrfToken);
    const { error } = await api.api.branches.post({
      name: formData.name,
      location: formData.location
    });
    
    loading = false;
    if (!error) {
      dialogOpen = false;
      invalidateAll();
      formData = { name: '', location: '' };
    } else {
      alert('Gagal menambah cabang');
    }
  }

  async function deleteBranch(id: number) {
    if (!confirm('Hapus cabang ini? Semua transaksi terkait mungkin akan gagal atau cabang tidak dapat dihapus jika ada transaksi.')) return;
    const api = getApi(window.location.origin, data.csrfToken);
    const { error } = await api.api.branches({ id }).delete();
    if (!error) {
      invalidateAll();
    } else {
      alert(error.value || 'Gagal menghapus cabang');
    }
  }

  async function handleLogout() {
    await fetch('/logout', { method: 'POST' });
    window.location.href = '/login';
  }
</script>

<div class="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 p-6">
  <div class="max-w-5xl mx-auto space-y-8">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold tracking-tight">Daftar Cabang</h2>
      <Dialog.Root bind:open={dialogOpen}>
        <Dialog.Trigger>
          <Button>+ Baru</Button>
        </Dialog.Trigger>
        <Dialog.Content class="sm:max-w-[425px]">
          <Dialog.Header>
            <Dialog.Title>Cabang Baru</Dialog.Title>
            <Dialog.Description>Masukkan data cabang baru.</Dialog.Description>
          </Dialog.Header>
          <form onsubmit={submitBranch} class="space-y-4 py-4">
            <div class="space-y-2">
              <Label for="name">Nama Cabang</Label>
              <Input id="name" type="text" bind:value={formData.name} required placeholder="Cabang Bintaro" />
            </div>
            <div class="space-y-2">
              <Label for="location">Lokasi</Label>
              <Input id="location" type="text" bind:value={formData.location} placeholder="Tangerang Selatan" />
            </div>
            <div class="flex justify-end pt-4">
              <Button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan Cabang'}</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Root>
    </div>

    <Card.Root>
      <Card.Header>
        <Card.Title>Daftar Cabang</Card.Title>
      </Card.Header>
      <Card.Content>
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>ID</Table.Head>
              <Table.Head>Nama Cabang</Table.Head>
              <Table.Head>Lokasi</Table.Head>
              <Table.Head>Dibuat Pada</Table.Head>
              <Table.Head class="w-[80px]"></Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each data.branches as branch}
              <Table.Row>
                <Table.Cell>{(branch as { id: number }).id}</Table.Cell>
                <Table.Cell class="font-medium">{(branch as { name: string }).name}</Table.Cell>
                <Table.Cell>{(branch as { location: string | null }).location || '-'}</Table.Cell>
                <Table.Cell>{new Date((branch as { createdAt: Date }).createdAt).toLocaleDateString('id-ID')}</Table.Cell>
                <Table.Cell>
                  <Button
                    variant="ghost"
                    size="sm"
                    class="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    onclick={() => deleteBranch((branch as { id: number }).id)}
                  >Hapus</Button>
                </Table.Cell>
              </Table.Row>
            {/each}
            {#if data.branches.length === 0}
              <Table.Row>
                <Table.Cell colspan={5} class="h-24 text-center">Belum ada cabang.</Table.Cell>
              </Table.Row>
            {/if}
          </Table.Body>
        </Table.Root>
      </Card.Content>
    </Card.Root>
  </div>
</div>
