import { ReactNode } from 'react';
import { ConvexReactClient, ConvexProvider } from 'convex/react';

// Hardcodeamos la URL de Convex para producción
const CONVEX_URL = 'https://outgoing-caterpillar-343.convex.cloud';

const convex = new ConvexReactClient(CONVEX_URL, { unsavedChangesWarning: false });

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={convex}>{children}</ConvexProvider>
  );
}
