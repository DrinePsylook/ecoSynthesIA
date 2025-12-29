import { Routes, Route } from 'react-router-dom';
import Header from '../components/header'
import HomePage from '../pages/homePage';
import AllCategoriesPage from '../pages/allCategoriesPage';
import CategoryPage from '../pages/categoryPage';

function App() { 
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/categories" element={<AllCategoriesPage />} />
        <Route path="/categories/:id" element={<CategoryPage />} />
      </Routes>
    </>
  )
}

export default App
