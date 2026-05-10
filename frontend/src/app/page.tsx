import { Hero } from "@/components/hero";

const sections = [
  "AI Features",
  "Product Showcase",
  "Adaptive Learning Intelligence",
  "AI Confidence Meter",
  "Smart Timeline Preview",
  "Testimonials",
  "Pricing",
  "CTA Footer"
];

export default function LandingPage() {
  return (
    <div>
      <Hero />
      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-24 md:grid-cols-2">
        {sections.map((name) => (
          <article key={name} className="glass rounded-2xl p-6 transition hover:-translate-y-1 hover:shadow-neon">
            <h2 className="text-xl font-semibold">{name}</h2>
            <p className="mt-3 text-sm text-zinc-300">
              Premium interactive section powered by animated micro interactions and adaptive AI
              signals.
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
