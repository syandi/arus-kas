<script lang="ts">
  import { enhance } from '$app/forms';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Card from '$lib/components/ui/card';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
  let loading = $state(false);
</script>

<div class="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center items-center p-4">
  <div class="w-full max-w-sm">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Arus Kas</h1>
      <p class="text-sm text-zinc-500 mt-2">Masuk ke sistem manajemen cabang</p>
    </div>

    <Card.Root>
      <Card.Content class="pt-6">
        {#if form?.error}
          <div class="mb-4 p-3 rounded-md bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm">
            {form.error}
          </div>
        {/if}

        <form method="POST" use:enhance={() => {
          loading = true;
          return async ({ update }) => {
            await update();
            loading = false;
          };
        }} class="space-y-4">
          <div class="space-y-2">
            <Label for="username">Username</Label>
            <Input id="username" name="username" type="text" required placeholder="admin" disabled={loading} />
          </div>
          <div class="space-y-2">
            <Label for="password">Password</Label>
            <Input id="password" name="password" type="password" required disabled={loading} />
          </div>
          <Button type="submit" class="w-full" disabled={loading}>
            {loading ? 'Masuk...' : 'Masuk'}
          </Button>
        </form>
      </Card.Content>
    </Card.Root>
  </div>
</div>
