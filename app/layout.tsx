import "./globals.css";

export const metadata = {
  title: "Kas",
  description: "Aplikasi pencatatan pembayaran kas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}