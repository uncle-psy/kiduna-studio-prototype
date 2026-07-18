export const metadata = {
  title: "The Genesis Nightpaper — Kiduna",
  description: "The Genesis Nightpaper from Kiduna.",
};

export default function NightpaperPage() {
  return (
    <main style={{ width: "100vw", height: "100dvh", overflow: "hidden", background: "#f4efe8" }}>
      <iframe
        src="/nightpaper-source"
        title="The Genesis Nightpaper"
        style={{ display: "block", width: "100%", height: "100%", border: 0 }}
      />
    </main>
  );
}
