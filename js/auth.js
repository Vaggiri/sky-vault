import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2';
import { loadFiles } from './storage.js';
import { showNotification } from './ui.js';

// Debug flag - set to true to see console logs
const DEBUG = true;

// Initialize Supabase client
const supabaseUrl = 'https://rqnweydrcqclvgflliwi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxbndleWRyY3FjbHZnZmxsaXdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NDM4NDMsImV4cCI6MjA3MTAxOTg0M30.CPoKN9YprXU1kA_zAmkOGnxfkvbz_r7O5dKPkeeSI8A';
const supabase = createClient(supabaseUrl, supabaseKey);

// DOM Elements
const elements = {
  authModal: document.getElementById('auth-modal'),
  loginForm: document.getElementById('login-form'),
  registerForm: document.getElementById('register-form'),
  fileBrowser: document.getElementById('file-browser'),
  welcomeSection: document.getElementById('welcome-section'),
  uploadBtn: document.getElementById('upload-btn'),
  userMenu: document.getElementById('user-menu'),
  authBtn: document.getElementById('auth-btn'),
  userAvatar: document.querySelector('.user-avatar'),
  loginEmail: document.getElementById('login-email'),
  loginPassword: document.getElementById('login-password')
};

// Verify all required elements exist
function verifyElements() {
  if (DEBUG) console.log('Verifying DOM elements...');
  for (const [key, element] of Object.entries(elements)) {
    if (!element) {
      console.error(`Element not found: ${key}`);
      return false;
    }
  }
  if (DEBUG) console.log('All elements verified');
  return true;
}

// Authentication state management
async function checkAuthState() {
  if (DEBUG) console.log('Checking auth state...');
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) throw error;
    
    if (user) {
      if (DEBUG) console.log('User is authenticated:', user.email);
      handleLoggedInState(user);
    } else {
      if (DEBUG) console.log('No authenticated user');
      handleLoggedOutState();
    }
    
    return { user, error };
  } catch (error) {
    console.error('Auth state check failed:', error);
    handleLoggedOutState();
    return { user: null, error };
  }
}

function handleLoggedInState(user) {
  if (DEBUG) console.log('Handling logged in state for:', user.email);
  
  // Update UI
  elements.fileBrowser.classList.remove('hidden');
  elements.welcomeSection.classList.add('hidden');
  elements.uploadBtn.classList.remove('hidden');
  elements.userMenu.classList.remove('hidden');
  elements.authBtn.classList.add('hidden');
  
  // Update avatar
  if (user.email) {
    elements.userAvatar.textContent = user.email.charAt(0).toUpperCase();
  }
  
  // Load files
  loadFiles().catch(error => {
    console.error('Failed to load files:', error);
    showNotification('Failed to load files', 'error');
  });
}

function handleLoggedOutState() {
  if (DEBUG) console.log('Handling logged out state');
  
  // Update UI
  elements.welcomeSection.classList.remove('hidden');
  elements.fileBrowser.classList.add('hidden');
  elements.uploadBtn.classList.add('hidden');
  elements.userMenu.classList.add('hidden');
  elements.authBtn.classList.remove('hidden');
}

// Authentication functions
export async function signIn(email, password) {
  if (DEBUG) console.log('Attempting sign in with:', email);
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim()
    });

    if (error) {
      if (DEBUG) console.error('Sign in error:', error);
      throw error;
    }
    
    if (DEBUG) console.log('Sign in successful:', data.user.email);
    return data;
  } catch (error) {
    console.error('Sign in failed:', error);
    throw new Error(getUserFriendlyError(error.message));
  }
}

// Form handling
function setupLoginForm() {
  if (!elements.loginForm) {
    console.error('Login form not found');
    return;
  }

  elements.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (DEBUG) console.log('Login form submitted');
    
    const email = elements.loginEmail.value;
    const password = elements.loginPassword.value;

    if (!email || !password) {
      showNotification('Please enter both email and password', 'error');
      return;
    }

    try {
      const { data } = await signIn(email, password);
      handleLoggedInState(data.user);
      toggleAuthModal();
      showNotification('Login successful!', 'success');
    } catch (error) {
      showNotification(error.message, 'error');
    }
  });
}

// UI Functions
function toggleAuthModal() {
  if (!elements.authModal) return;
  
  elements.authModal.classList.toggle('hidden');
  const modalContent = elements.authModal.querySelector('div > div');
  
  if (elements.authModal.classList.contains('hidden')) {
    modalContent.classList.remove('scale-100', 'opacity-100');
    modalContent.classList.add('scale-95', 'opacity-0');
  } else {
    modalContent.classList.remove('scale-95', 'opacity-0');
    modalContent.classList.add('scale-100', 'opacity-100');
  }
}

// Error handling
function getUserFriendlyError(errorMsg) {
  const errors = {
    'Invalid login credentials': 'Invalid email or password',
    'Email not confirmed': 'Please verify your email first',
    'User already registered': 'Email already in use',
    'Password should be at least 6 characters': 'Password must be 6+ characters'
  };
  return errors[errorMsg] || 'Authentication failed. Please try again.';
}

// Initialize
function initAuth() {
  if (!verifyElements()) {
    console.error('Critical elements missing - auth cannot initialize');
    return;
  }

  setupLoginForm();
  checkAuthState();
  
  // Initialize other event listeners...
  if (elements.authBtn) {
    elements.authBtn.addEventListener('click', toggleAuthModal);
  }
}

// Start the auth system
document.addEventListener('DOMContentLoaded', initAuth);

// Export what you need
export { 
  supabase,
  checkAuthState,
  handleLoggedInState,
  handleLoggedOutState
};