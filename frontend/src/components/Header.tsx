import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Disclosure, DisclosureButton, DisclosurePanel, Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { Bars3Icon, XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/authContext';
import ProfileDropdown from './ProfileDropdown';
import AuthButtons from './AuthButtons';

// Simplified category interface for the dropdown (only id and name from /api/categories)
interface CategoryBasic {
  id: number;
  name: string;
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export default function Header() {
  const { t } = useTranslation();
  
  // Current page detection
  const { pathname: currentPath } = useLocation();
  
  // Auth state - determines what to show in the header (ProfileDropdown or AuthButtons)
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  // State for categories dropdown
  const [categories, setCategories] = useState<CategoryBasic[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  
  // Fetch categories on component mount
  useEffect(() => {
      fetch(`${import.meta.env.VITE_BACKEND_URL}/api/categories`)
      .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
      })
      .then(data => {
          // Extract categories from the 'data' property of the response
          setCategories(data.data || []);
          setCategoriesLoading(false);
      })
      .catch(error => {
          console.error('Error fetching categories:', error);
          setCategories([]);
          setCategoriesLoading(false);
      });
  }, []);
  
  return (
      <Disclosure as="nav" className="relative bg-emerald-900">
          <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
              <div className="relative flex h-16 items-center justify-between">
                  <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
                      {/* Mobile menu button */}
                      <DisclosureButton className="group relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-white/5 hover:text-white focus:outline-2 focus:-outline-offset-1 focus:outline-indigo-500">
                          <span className="absolute -inset-0.5" />
                          <span className="sr-only">{t('common.openMainMenu')}</span>
                          <Bars3Icon aria-hidden="true" className="block size-6 group-data-open:hidden" />
                          <XMarkIcon aria-hidden="true" className="hidden size-6 group-data-open:block" />
                      </DisclosureButton>
                  </div>
                  <div className="flex flex-1 items-center justify-center lg:items-stretch lg:justify-start">
                      <div className="flex shrink-0 items-center">
                          <img
                              alt="EcoSynthesIA"
                              src="../src/assets/logo_ecoSynthesIA_bulle.png"
                              className="h-10 w-10"
                          />
                      </div>
                      <div className="hidden lg:ml-14 lg:flex lg:h-full lg:items-center">
                          <div className="flex space-x-8 items-center">
                              {/* Home link */}
                              <a 
                                  href="/"
                                  className={classNames(
                                      currentPath === '/' ? 'bg-green-400 text-white' : 'text-green-300 hover:bg-white/5 hover:text-white',
                                      'rounded-md px-3 py-2 text-lg font-medium',
                                  )}
                              >
                                  {t('nav.home')}
                              </a>
                              
                              {/* Categories dropdown */}
                              <Menu as="div" className="relative">
                                  <MenuButton 
                                      className={classNames(
                                          currentPath.startsWith('/categories') ? 'bg-green-400 text-white' : 'text-green-300 hover:bg-white/5 hover:text-white',
                                          'rounded-md px-3 py-2 text-lg font-medium inline-flex items-center gap-1',
                                      )}
                                  >
                                      {t('nav.categories')}
                                      <ChevronDownIcon className="h-4 w-4" aria-hidden="true" />
                                  </MenuButton>
                                  
                                  <MenuItems
                                      transition
                                      className="absolute left-0 z-10 mt-2 w-72 origin-top-left rounded-md bg-white py-1 shadow-lg outline outline-black/5 transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
                                  >
                                      {categoriesLoading ? (
                                          <div className="px-4 py-2 text-gray-500 text-sm">{t('common.loading')}</div>
                                      ) : categories.length === 0 ? (
                                          <div className="px-4 py-2 text-gray-500 text-sm">{t('categories.noCategories')}</div>
                                      ) : (
                                          categories.map((category) => (
                                              <MenuItem key={category.id}>
                                                  <a
                                                      href={`/categories/${category.id}`}
                                                      className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-emerald-50 data-focus:text-emerald-800 data-focus:outline-hidden"
                                                  >
                                                      {category.name}
                                                  </a>
                                              </MenuItem>
                                          ))
                                      )}
                                      {/* View all categories link */}
                                      <div className="border-t border-gray-100 mt-1 pt-1">
                                          <MenuItem>
                                              <Link to="/categories" className="block px-4 py-2 text-sm font-medium text-emerald-600 data-focus:bg-emerald-50 data-focus:outline-hidden">
                                                  {t('nav.viewAllCategories')} →
                                              </Link>
                                          </MenuItem>
                                      </div>
                                  </MenuItems>
                              </Menu>
                              
                              {/* Documents link */}
                              <a 
                                  href="/documents"
                                  className={classNames(
                                      currentPath === '/documents' ? 'bg-green-400 text-white' : 'text-green-300 hover:bg-white/5 hover:text-white',
                                      'rounded-md px-3 py-2 text-lg font-medium',
                                  )}
                              >
                                  {t('nav.documents')}
                              </a>
                              
                              {/* Contact link */}
                              <a 
                                  href="/contact"
                                  className={classNames(
                                      currentPath === '/contact' ? 'bg-green-400 text-white' : 'text-green-300 hover:bg-white/5 hover:text-white',
                                      'rounded-md px-3 py-2 text-lg font-medium',
                                  )}
                              >
                                  {t('nav.contact')}
                              </a>
                          </div>
                      </div>
                  </div>

                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
                      {/* Auth section - shows ProfileDropdown or AuthButtons based on auth state */}
                      {authLoading ? (
                          // Loading state - show skeleton while checking auth
                          <div className="size-10 rounded-full bg-emerald-800 animate-pulse" />
                      ) : isAuthenticated ? (
                          // User is logged in - show profile dropdown
                          <ProfileDropdown />
                      ) : (
                          // User is not logged in - show login/register buttons
                          <AuthButtons />
                      )}
                  </div>
              </div>
          </div>
          
          {/* Mobile menu panel */}
          <DisclosurePanel className="lg:hidden">
              <div className="space-y-1 px-2 pt-2 pb-3">
                  {/* Home link */}
                  <DisclosureButton
                      as="a"
                      href="/"
                      aria-current={currentPath === '/' ? 'page' : undefined}
                      className={classNames(
                          currentPath === '/' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white',
                          'block rounded-md px-3 py-2 text-base font-medium',
                      )}
                  >
                      {t('nav.home')}
                  </DisclosureButton>
                  
                  {/* Categories section */}
                  <div className="border-t border-emerald-700 pt-2 mt-2">
                      <span className="block px-3 py-1 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                          {t('nav.categories')}
                      </span>
                      {categoriesLoading ? (
                          <span className="block px-3 py-2 text-sm text-gray-400">{t('common.loading')}</span>
                      ) : (
                          categories.map((category) => (
                              <DisclosureButton
                                  key={category.id}
                                  as="a"
                                  href={`/categories/${category.id}`}
                                  className="block rounded-md px-6 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white"
                              >
                                  {category.name}
                              </DisclosureButton>
                          ))
                      )}
                  </div>
                  
                  {/* Documents and Contact links */}
                  <div className="border-t border-emerald-700 pt-2 mt-2">
                      <DisclosureButton
                          as="a"
                          href="/documents"
                          aria-current={currentPath === '/documents' ? 'page' : undefined}
                          className={classNames(
                              currentPath === '/documents' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white',
                              'block rounded-md px-3 py-2 text-base font-medium',
                          )}
                      >
                          {t('nav.documents')}
                      </DisclosureButton>
                      <DisclosureButton
                          as="a"
                          href="/contact"
                          aria-current={currentPath === '/contact' ? 'page' : undefined}
                          className={classNames(
                              currentPath === '/contact' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white',
                              'block rounded-md px-3 py-2 text-base font-medium',
                          )}
                      >
                          {t('nav.contact')}
                      </DisclosureButton>
                  </div>
              </div>
          </DisclosurePanel>
      </Disclosure>
  )
}
