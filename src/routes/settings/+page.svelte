<script lang="ts">
  import { enhance } from '$app/forms';
  import * as Card from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import type { ActionData, PageData } from './$types';

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
</script>

<div class="flex flex-col items-center justify-center pt-10 pb-4 px-4">
  <div class="w-full max-w-md space-y-4">

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
  </div>
</div>
