<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';

	let { children, data } = $props();

	async function handleLogout() {
		await fetch('/logout', { method: 'POST' });
		window.location.href = '/login';
	}
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{#if data.user}
  <nav class="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10">
    <div class="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
      <div class="flex items-center gap-8">
        <h1 class="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Arus Kas</h1>
        <div class="flex items-center gap-6">
          <a
            href="/"
            class="text-sm font-medium transition-colors hover:text-zinc-900 dark:hover:text-zinc-50 {$page.url.pathname === '/' ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-500 dark:text-zinc-400'}"
            onclick={() => {
              window.location.href = '/';
            }}
          >Dashboard</a>
          {#if data.user?.branchId === null}
            <a
              href="/branches"
              class="text-sm font-medium transition-colors hover:text-zinc-900 dark:hover:text-zinc-50 {$page.url.pathname === '/branches' ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-500 dark:text-zinc-400'}"
              onclick={() => {
                window.location.href = '/branches';
              }}
            >Master Cabang</a>
            <a
              href="/users"
              class="text-sm font-medium transition-colors hover:text-zinc-900 dark:hover:text-zinc-50 {$page.url.pathname === '/users' ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-500 dark:text-zinc-400'}"
              onclick={() => {
                window.location.href = '/users';
              }}
            >Pengguna</a>
          {/if}
          <a
            href="/settings"
            class="text-sm font-medium transition-colors hover:text-zinc-900 dark:hover:text-zinc-50 {$page.url.pathname === '/settings' ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-500 dark:text-zinc-400'}"
            onclick={() => {
              window.location.href = '/settings';
            }}
          >Pengaturan</a>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <span class="text-sm font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">{data.user.username}</span>
        <button onclick={handleLogout} class="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 transition-colors">Logout</button>
      </div>
    </div>
  </nav>
{/if}

<main class="min-h-[calc(100vh-4rem)] bg-zinc-50 dark:bg-zinc-950">
	{@render children()}
</main>
