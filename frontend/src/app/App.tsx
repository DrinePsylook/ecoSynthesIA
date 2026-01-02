import { AuthProvider } from '../contexts/AuthProvider';
import { Routes, Route } from 'react-router-dom';
import Header from '../components/Header';
import HomePage from '../pages/homePage';
import AllCategoriesPage from '../pages/allCategoriesPage';
import CategoryPage from '../pages/categoryPage';
import AllDocumentsPage from '../pages/allDocumentsPage';
import DocumentPage from '../pages/documentPage';
import LoginPage from '../pages/loginPage';
import RegisterPage from '../pages/registerPage';

function App() { 
  return (
    <AuthProvider>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/categories" element={<AllCategoriesPage />} />
        <Route path="/categories/:id" element={<CategoryPage />} />
        <Route path="/documents" element={<AllDocumentsPage />} />
        <Route path="/documents/:id" element={<DocumentPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;