export default function DemoPage() {
  return (
    <div class="p-md">
      <h1 class="text-2xl font-bold">Utility Demo</h1>

      <section class="m-md">
        <h2 class="text-lg font-bold">Spacing</h2>
        <div class="flex gap-sm">
          <div class="p-sm bg-light rounded">p-sm</div>
          <div class="p-md bg-light rounded">p-md</div>
          <div class="p-lg bg-light rounded">p-lg</div>
        </div>
      </section>

      <section class="m-md">
        <h2 class="text-lg font-bold">Typography</h2>
        <p class="text-sm">text-sm</p>
        <p class="text-base">text-base</p>
        <p class="text-lg">text-lg</p>
        <p class="text-xl">text-xl</p>
        <p class="text-2xl">text-2xl</p>
      </section>

      <section class="m-md">
        <h2 class="text-lg font-bold">Colors</h2>
        <p class="text-primary">text-primary</p>
        <p class="text-secondary">text-secondary</p>
        <p class="text-success">text-success</p>
      </section>

      <section class="m-md">
        <h2 class="text-lg font-bold">Cards</h2>
        <div class="flex gap-md">
          <div class="p-md bg-light rounded shadow">Card 1</div>
          <div class="p-md bg-light rounded-lg shadow">Card 2</div>
        </div>
      </section>
    </div>
  );
}
