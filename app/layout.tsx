export const metadata = { title: "DattaSeller", robots: { index: false, follow: false } };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body style={{ margin: 0 }}>{children}</body></html>;
}
