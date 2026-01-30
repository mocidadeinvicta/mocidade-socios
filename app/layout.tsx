import "./globals.css";

export const metadata = {
  title: "Mocidade Invicta",
  description: "Mocidade Invicta Futebol Clube",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT">
      <body>{children}</body>
    </html>
  );
}
