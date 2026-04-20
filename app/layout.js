import './globals.css';

export const metadata = {
  title: 'Zerodha Kite Login Helper',
  description: 'Login to Zerodha Kite and store your access token',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
