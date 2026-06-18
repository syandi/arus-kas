<script lang="ts">
  import { enhance } from '$app/forms';
  import * as Card from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Dialog from '$lib/components/ui/dialog';
  import type { ActionData, PageData } from './$types';
  import { getApi } from '$lib/api';
  import { invalidateAll } from '$app/navigation';

  let { data, form }: { data: PageData, form: ActionData } = $props();
  let loading = $state(false);

  // Client-side validation state
  let newPassword = $state('');
  let confirmPassword = $state('');
  let clientError = $derived(
    newPassword && confirmPassword && newPassword !== confirmPassword 
      ? 'Konfirmasi password tidak cocok' 
      : null
  );

  let newKeyName = $state('');
  let generatedKey = $state<string | null>(null);
  let createKeyOpen = $state(false);

  async function createApiKey() {
    if (!newKeyName.trim()) return;
    const api = getApi(window.location.origin, data.csrfToken);
    
    const res = await api.api.keys.post({ name: newKeyName });
    if (!res.error) {
      generatedKey = (res.data as any).key;
      await invalidateAll();
    } else {
      alert('Gagal membuat API Key: ' + JSON.stringify(res.error));
    }
  }

  async function deleteApiKey(id: number) {
    if (!confirm('Hapus API Key ini? Akses yang menggunakan key ini akan terputus.')) return;
    const api = getApi(window.location.origin, data.csrfToken);
    const res = await api.api.keys({ id }).delete();
    if (!res.error) {
      await invalidateAll();
    } else {
      alert('Gagal menghapus API Key: ' + JSON.stringify(res.error));
    }
  }

  function closeCreateKey() {
    createKeyOpen = false;
    generatedKey = null;
    newKeyName = '';
  }
</script>

<div class="flex flex-col items-center justify-center pt-10 pb-10 px-4">
  <div class="w-full max-w-2xl space-y-6">

    <Card.Root>
      <Card.Header>
        <Card.Title>Pengaturan Akun</Card.Title>
        <Card.Description>Ubah kata sandi Anda di sini.</Card.Description>
      </Card.Header>
      <Card.Content>
        <form method="POST" action="?/changePassword" use:enhance={() => {
          loading = true;
          return async ({ update }) => {
            await update();
            loading = false;
          };
        }} class="space-y-4">
          
          {#if form?.error}
            <div class="p-3 text-sm text-red-800 bg-red-100 rounded-md dark:bg-red-900/50 dark:text-red-200">
              {form.error}
            </div>
          {/if}

          {#if clientError}
            <div class="p-3 text-sm text-red-800 bg-red-100 rounded-md dark:bg-red-900/50 dark:text-red-200">
              {clientError}
            </div>
          {/if}

          <div class="space-y-2">
            <Label for="oldPassword">Password Lama</Label>
            <Input id="oldPassword" name="oldPassword" type="password" required />
          </div>

          <div class="space-y-2">
            <Label for="newPassword">Password Baru</Label>
            <Input id="newPassword" name="newPassword" type="password" bind:value={newPassword} required />
          </div>

          <div class="space-y-2">
            <Label for="confirmPassword">Konfirmasi Password Baru</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" bind:value={confirmPassword} required />
          </div>

          <div class="pt-4">
            <Button type="submit" class="w-full" disabled={loading || clientError !== null}>
              {loading ? 'Menyimpan...' : 'Simpan Password'}
            </Button>
          </div>
        </form>
      </Card.Content>
    </Card.Root>

    {#if data.user?.branchId === null}
    <Card.Root>
      <Card.Header>
        <Card.Title>Akses API Eksternal (Gemini)</Card.Title>
        <Card.Description>Kelola kunci API untuk mengakses data rekapan dari aplikasi pihak ketiga.</Card.Description>
      </Card.Header>
      <Card.Content class="space-y-4">
        <div class="flex justify-between items-center">
          <h3 class="text-sm font-medium">Kunci API Aktif</h3>
          <Button size="sm" onclick={() => createKeyOpen = true}>+ Buat Kunci Baru</Button>
        </div>
        
        {#if !data.apiKeys || data.apiKeys.length === 0}
          <div class="text-sm text-zinc-500 py-6 text-center border rounded-md bg-zinc-50/50 dark:bg-zinc-900/50 border-dashed">Belum ada kunci API yang dibuat.</div>
        {:else}
          <div class="space-y-3">
            {#each data.apiKeys as key}
              <div class="flex items-center justify-between p-4 border rounded-xl bg-white dark:bg-zinc-900 shadow-sm transition-all">
                <div>
                  <div class="font-semibold text-sm">{key.name}</div>
                  <div class="text-xs text-zinc-500 mt-1">Dibuat: {new Date(key.createdAt).toLocaleDateString('id-ID')}</div>
                </div>
                <Button variant="ghost" size="sm" class="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950" onclick={() => deleteApiKey(key.id)}>Hapus Kunci</Button>
              </div>
            {/each}
          </div>
        {/if}
      </Card.Content>
    </Card.Root>

    <Dialog.Root bind:open={createKeyOpen}>
      <Dialog.Content class="sm:max-w-[425px]">
        <Dialog.Header>
          <Dialog.Title>{generatedKey ? 'API Key Berhasil Dibuat!' : 'Buat Kunci API Baru'}</Dialog.Title>
          <Dialog.Description>
            {#if generatedKey}
              Salin kunci ini sekarang. Kunci ini <strong class="text-red-500">tidak akan pernah ditampilkan lagi</strong> demi keamanan.
            {:else}
              Beri nama untuk kunci API ini agar mudah dikenali (misal: "Gemini Advanced").
            {/if}
          </Dialog.Description>
        </Dialog.Header>
        
        <div class="py-4">
          {#if generatedKey}
            <div class="space-y-4">
              <div class="p-4 bg-zinc-100 dark:bg-zinc-900 rounded-lg break-all font-mono text-sm border border-zinc-200 dark:border-zinc-800 shadow-inner">
                {generatedKey}
              </div>
              <Button class="w-full bg-green-600 hover:bg-green-700 text-white" onclick={() => { navigator.clipboard.writeText(generatedKey || ''); alert('Berhasil disalin ke Clipboard!'); }}>Salin ke Clipboard</Button>
            </div>
          {:else}
            <div class="space-y-4">
              <div class="space-y-2">
                <Label for="keyName">Nama Kunci</Label>
                <Input id="keyName" bind:value={newKeyName} placeholder="Contoh: Gemini Analysis Script" />
              </div>
              <Button class="w-full bg-indigo-600 hover:bg-indigo-700 text-white" onclick={createApiKey} disabled={!newKeyName.trim()}>Generate Kunci</Button>
            </div>
          {/if}
        </div>
        
        {#if generatedKey}
          <Dialog.Footer>
            <Button variant="outline" class="w-full" onclick={closeCreateKey}>Tutup & Selesai</Button>
          </Dialog.Footer>
        {/if}
      </Dialog.Content>
    </Dialog.Root>
    {/if}

  </div>
</div>
