<script>
    import CovidWorldMap from "$lib/components/CovidWorldMap.svelte";
</script>

<svelte:head>
<title>COVID-19 Overview</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-6">COVID-19 Global Overview</h1>
    
    <div class="bg-white rounded-lg shadow-lg p-6">
        <CovidWorldMap />
    </div>
    
    <div class="mt-8 text-sm text-gray-600">
        <p>Data source: Google's COVID-19 Open Data Epidemiology dataset</p>
    </div>
</div>