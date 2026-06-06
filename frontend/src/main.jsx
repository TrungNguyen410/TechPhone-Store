import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';
import './assets/styles/main.css';
import './assets/styles/admin.css';
import './assets/styles/responsive.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <App />
          <ToastContainer
            position="top-right"
            autoClose={2600}
            hideProgressBar
            closeOnClick
            theme="light"
          />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
