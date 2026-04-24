/**
 * demo.tsx
 * 
 * Ejemplo de cómo usar el GameViewController en una aplicación React.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { GameViewController } from './GameViewController';

function App() {
  return (
    <div className="w-full h-screen bg-gray-900">
      <GameViewController />
    </div>
  );
}

// Montar la aplicación
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);

export default App;