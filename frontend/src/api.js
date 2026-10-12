const SESSION_KEY = 'employee-ui.session';

let unauthorizedHandler = null;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// ---- Session (JWT) storage ----

export function loadSession() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (session && session.expiresAt > Date.now()) {
      return session;
    }
  } catch {
    // ignore corrupt or unavailable storage
  }
  clearSession();
  return null;
}

function saveSession(auth) {
  const session = {
    token: auth.token,
    username: auth.username,
    expiresAt: Date.now() + auth.expiresIn * 1000,
  };
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // storage unavailable: session lasts until reload
  }
  return session;
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

/** Called when the API rejects the token (expired or invalid). */
export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}

// ---- HTTP helper ----

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (auth) {
    const session = loadSession();
    if (session) {
      headers.Authorization = `Bearer ${session.token}`;
    }
  }

  const response = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && auth) {
    clearSession();
    unauthorizedHandler?.();
    throw new ApiError('Your session has expired. Please log in again.', 401);
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      message = data.message || data.error || message;
    } catch {
      // response had no JSON body
    }
    throw new ApiError(message, response.status);
  }

  return response.status === 204 ? null : response.json();
}

// ---- Auth ----

export async function login(username, password) {
  const auth = await request('/api/auth/login', {
    method: 'POST',
    body: { username, password },
    auth: false,
  });
  return saveSession(auth);
}

export async function register(username, password) {
  const auth = await request('/api/auth/register', {
    method: 'POST',
    body: { username, password },
    auth: false,
  });
  return saveSession(auth);
}

// ---- Employees ----

export const employeesApi = {
  list: () => request('/api/employees'),
  create: (employee) => request('/api/employees', { method: 'POST', body: employee }),
  update: (id, employee) => request(`/api/employees/${id}`, { method: 'PUT', body: employee }),
  remove: (id) => request(`/api/employees/${id}`, { method: 'DELETE' }),
};
