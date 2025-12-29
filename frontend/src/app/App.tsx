import { Routes, Route } from 'react-router-dom';
import Header from '../components/header'
import HomePage from '../pages/homePage';
import AllCategoriesPage from '../pages/allCategoriesPage';
import CategoryPage from '../pages/categoryPage';
import AllDocumentsPage from '../pages/allDocumentsPage';
import DocumentPage from '../pages/documentPage';

function App() { 
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/categories" element={<AllCategoriesPage />} />
        <Route path="/categories/:id" element={<CategoryPage />} />
        <Route path="/documents" element={<AllDocumentsPage />} />
        <Route path="/documents/:id" element={<DocumentPage />} />
      </Routes>
    </>
  )
}

export default App
