export default function sitemap() {
  return [{
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://snacks911-lro4.vercel.app',
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 1,
  }]
}
