const state = {
  token: '',
  user: null,
  view: 'dashboard',
  records: [],
  editingId: null,
  noticeTimer: null
};

const $ = (selector) => document.querySelector(selector);
const viewTitles = {
  dashboard: ['PANEL DE CONTROL', 'Resumen'],
  clients: ['RELACIONES COMERCIALES', 'Clientes'],
  contracts: ['ACUERDOS Y SERVICIOS', 'Contratos'],
  documents: ['ARCHIVO DIGITAL', 'Documentos'],
  users: ['CONTROL DE ACCESO', 'Usuarios'],
  audit: ['TRAZABILIDAD', 'Auditoría']
};
const routes = {
  clients: '/api/clients',
  contracts: '/api/contracts',
  documents: '/api/documents',
  users: '/api/users',
  audit: '/api/audit'
};

function node(tag, className, value) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (value !== undefined) element.textContent = String(value);
  return element;
}

function add(parent, tag, className, value) {
  const element = node(tag, className, value);
  parent.append(element);
  return element;
}

async function api(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  if (options.body) headers['Content-Type'] = 'application/json';
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401 && !url.endsWith('/api/auth/login')) {
    logout('Tu sesión expiró. Vuelve a ingresar.');
    throw new Error('Sesión expirada.');
  }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Error HTTP ${response.status}`);
  return data;
}

function showNotice(message, isError = false) {
  const notice = $('#notice');
  notice.textContent = message;
  notice.classList.toggle('error', isError);
  notice.classList.remove('hidden');
  window.clearTimeout(state.noticeTimer);
  state.noticeTimer = window.setTimeout(() => notice.classList.add('hidden'), 3600);
}

function setAuthenticated(user, token) {
  state.user = user;
  state.token = token;
  $('#login-screen').classList.add('hidden');
  $('#app-shell').classList.remove('hidden');
  $('#profile-name').textContent = user.name;
  $('#profile-role').textContent = user.role;
  $('#profile-avatar').textContent = user.name.trim().charAt(0).toUpperCase();
  document.querySelectorAll('.admin-only').forEach((item) => {
    item.classList.toggle('hidden', user.role !== 'admin');
  });
  navigate('dashboard');
}

function logout(message) {
  state.user = null;
  state.token = '';
  $('#app-shell').classList.add('hidden');
  $('#login-screen').classList.remove('hidden');
  $('#login-password').value = '';
  $('#login-error').textContent = message || '';
}

function navigate(view) {
  if (view === 'users' || view === 'audit') {
    if (state.user?.role !== 'admin') return;
  }
  state.view = view;
  const title = viewTitles[view] || viewTitles.dashboard;
  $('#view-kicker').textContent = title[0];
  $('#view-title').textContent = title[1];
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.view === view);
  });
  $('#sidebar').classList.remove('open');
  loadView().catch((error) => showNotice(error.message, true));
}

async function loadView() {
  if (state.view === 'dashboard') return renderDashboard();
  state.records = await api(routes[state.view]);
  renderTable(state.view, state.records);
}

async function renderDashboard() {
  const [summary, clients, contracts] = await Promise.all([
    api('/api/summary'), api('/api/clients'), api('/api/contracts')
  ]);
  const host = $('#view-content');
  host.replaceChildren();

  const welcome = add(host, 'section', 'welcome-row');
  const greeting = add(welcome, 'div');
  add(greeting, 'h2', '', `Hola, ${state.user.name.split(' ')[0]}`);
  add(greeting, 'p', '', 'Este es el estado actual de tu espacio de trabajo.');
  if (state.user.role === 'admin') {
    const create = add(welcome, 'button', 'button primary', '＋ Nuevo cliente');
    create.type = 'button';
    create.addEventListener('click', () => openForm('clients'));
  }

  const cards = add(host, 'section', 'stats-grid');
  [
    ['Clientes', summary.clients, '◉', 'Empresas registradas'],
    ['Contratos', summary.contracts, '▤', 'Acuerdos en el sistema'],
    ['Contratos activos', summary.active_contracts, '✓', 'En ejecución actualmente'],
    ['Riesgo alto', summary.high_risk_clients, '!', 'Clientes para revisión']
  ].forEach(([label, value, icon, note]) => {
    const card = add(cards, 'article', 'stat-card');
    const heading = add(card, 'div', 'stat-label');
    add(heading, 'span', '', label);
    add(heading, 'span', 'stat-icon', icon);
    add(card, 'strong', 'stat-value', value);
    add(card, 'div', 'stat-note', note);
  });

  const grid = add(host, 'section', 'dashboard-grid');
  const clientPanel = add(grid, 'article', 'panel');
  const clientHeading = add(clientPanel, 'div', 'panel-heading');
  const clientTitle = add(clientHeading, 'div');
  add(clientTitle, 'h3', '', 'Clientes recientes');
  add(clientTitle, 'p', '', 'Últimas empresas registradas');
  const allClients = add(clientHeading, 'button', 'link-button', 'Ver todos');
  allClients.type = 'button';
  allClients.addEventListener('click', () => navigate('clients'));
  const clientList = add(clientPanel, 'div', 'quick-list');
  clients.slice(0, 4).forEach((client) => {
    const row = add(clientList, 'div', 'quick-row');
    add(row, 'span', 'quick-avatar', client.company.trim().charAt(0).toUpperCase());
    const info = add(row, 'span', 'quick-info');
    add(info, 'strong', '', client.company);
    add(info, 'small', '', client.email);
    add(row, 'span', `pill ${client.riskLevel}`, `Riesgo ${client.riskLevel}`);
  });
  if (!clients.length) add(clientList, 'p', 'empty-state', 'Aún no hay clientes registrados.');

  const contractPanel = add(grid, 'article', 'panel');
  const contractHeading = add(contractPanel, 'div', 'panel-heading');
  const contractTitle = add(contractHeading, 'div');
  add(contractTitle, 'h3', '', 'Contratos recientes');
  add(contractTitle, 'p', '', 'Seguimiento de acuerdos y servicios');
  const allContracts = add(contractHeading, 'button', 'link-button', 'Ver todos');
  allContracts.type = 'button';
  allContracts.addEventListener('click', () => navigate('contracts'));
  const contractList = add(contractPanel, 'div', 'quick-list');
  contracts.slice(0, 4).forEach((contract) => {
    const row = add(contractList, 'div', 'quick-row');
    add(row, 'span', 'quick-avatar', 'CT');
    const info = add(row, 'span', 'quick-info');
    add(info, 'strong', '', contract.title);
    add(info, 'small', '', `${contract.number} · ${contract.clientName}`);
    add(row, 'span', `pill ${contract.status}`, contract.status);
  });
  if (!contracts.length) add(contractList, 'p', 'empty-state', 'Aún no hay contratos registrados.');
}

function column(value, secondary) {
  const cell = node('span', 'cell-primary', value || '—');
  if (!secondary) return cell;
  const wrapper = node('span');
  wrapper.append(cell, node('span', 'cell-secondary', secondary));
  return wrapper;
}

function renderTable(kind, records) {
  const host = $('#view-content');
  host.replaceChildren();
  const configs = {
    clients: {
      subtitle: 'Administra la información de tus empresas y contactos.',
      headers: ['Cliente', 'Contacto', 'Riesgo', 'Estado', 'Cuenta bancaria', 'Acciones'],
      cells: (record) => [
        column(record.company, record.rut || record.name),
        column(record.email, record.phone),
        pill(record.riskLevel),
        pill(record.status),
        record.bankAccountLast4 ? `•••• ${record.bankAccountLast4}` : 'No registrada'
      ]
    },
    contracts: {
      subtitle: 'Controla fechas, responsables y estado de cada acuerdo.',
      headers: ['Contrato', 'Cliente', 'Vigencia', 'Monto CLP', 'Estado', 'Acciones'],
      cells: (record) => [
        column(record.title, record.number),
        record.clientName || '—',
        `${formatDate(record.startDate)} — ${formatDate(record.endDate)}`,
        formatCurrency(record.value),
        pill(record.status)
      ]
    },
    documents: {
      subtitle: 'Mantén organizado el registro y estado documental de contratos.',
      headers: ['Documento', 'Contrato', 'Categoría', 'Archivo referenciado', 'Estado', 'Acciones'],
      cells: (record) => [
        column(record.name, record.notes),
        record.contractNumber || '—',
        record.category,
        record.fileName || 'Sin archivo',
        pill(record.status)
      ]
    },
    users: {
      subtitle: 'Gestiona cuentas y aplica permisos según el rol asignado.',
      headers: ['Usuario', 'Correo', 'Rol', 'Estado', 'Creado', 'Acciones'],
      cells: (record) => [
        column(record.name, `ID ${record.id}`),
        record.email,
        pill(record.role),
        pill(record.active ? 'activo' : 'inactivo'),
        formatDate(record.createdAt)
      ]
    },
    audit: {
      subtitle: 'Registro de operaciones críticas realizadas en el sistema.',
      headers: ['Fecha y hora', 'Actor', 'Acción', 'Módulo', 'Registro', 'Detalle'],
      cells: (record) => [
        formatDateTime(record.created_at),
        record.actor_email,
        record.action,
        record.entity,
        record.entity_id || '—',
        JSON.stringify(record.details || {})
      ],
      readonly: true
    }
  };
  const config = configs[kind];
  const toolbar = add(host, 'section', 'table-toolbar');
  const titleArea = add(toolbar, 'div');
  add(titleArea, 'h2', '', `${config.headers[0]}${kind === 'clients' ? ' registrados' : ''}`);
  add(titleArea, 'p', '', config.subtitle);
  const actions = add(toolbar, 'div', 'toolbar-actions');
  const search = add(actions, 'input', 'search-input');
  search.type = 'search';
  search.placeholder = 'Buscar...';
  search.setAttribute('aria-label', 'Buscar en registros');
  if (state.user.role === 'admin' && !config.readonly) {
    const create = add(actions, 'button', 'button primary', '＋ Nuevo');
    create.type = 'button';
    create.addEventListener('click', () => openForm(kind));
  }

  const panel = add(host, 'section', 'table-panel');
  const scroll = add(panel, 'div', 'table-scroll');
  const table = add(scroll, 'table');
  const head = add(table, 'thead');
  const headRow = add(head, 'tr');
  config.headers.forEach((header) => add(headRow, 'th', '', header));
  const body = add(table, 'tbody');

  function drawRows(query = '') {
    body.replaceChildren();
    const filtered = records.filter((record) =>
      JSON.stringify(record).toLowerCase().includes(query.toLowerCase())
    );
    if (!filtered.length) {
      const row = add(body, 'tr');
      const empty = add(row, 'td', 'empty-state', records.length ? 'No hay coincidencias.' : 'No hay registros para mostrar.');
      empty.colSpan = config.headers.length;
      return;
    }
    filtered.forEach((record) => {
      const row = add(body, 'tr');
      config.cells(record).forEach((cell) => {
        const td = add(row, 'td');
        if (cell instanceof Node) td.append(cell);
        else if (cell?.nodeType) td.append(cell);
        else td.textContent = String(cell ?? '—');
      });
      if (!config.readonly) {
        const td = add(row, 'td');
        const rowActions = add(td, 'div', 'row-actions');
        const edit = add(rowActions, 'button', 'small-action', 'Editar');
        edit.type = 'button';
        edit.addEventListener('click', () => openForm(kind, record));
        if (kind === 'users') {
          const toggle = add(rowActions, 'button', 'small-action', record.active ? 'Desactivar' : 'Activar');
          toggle.type = 'button';
          toggle.addEventListener('click', () => updateUserActive(record));
        } else {
          const remove = add(rowActions, 'button', 'small-action', 'Eliminar');
          remove.type = 'button';
          remove.addEventListener('click', () => removeRecord(kind, record));
        }
      }
    });
  }

  search.addEventListener('input', () => drawRows(search.value));
  drawRows();
}

function pill(value) {
  const element = node('span', `pill ${String(value || '').toLowerCase()}`, value || '—');
  return element;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return '—';
  const parsed = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? String(value).slice(0, 10) : new Intl.DateTimeFormat('es-CL').format(parsed);
}

function formatDateTime(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short' }).format(parsed);
}

async function openForm(kind, record = null) {
  if (state.user.role !== 'admin') return;
  state.editingId = record?.id || null;
  const dialog = $('#record-dialog');
  const form = $('#record-form');
  const fields = $('#form-fields');
  const titleMap = { clients: 'cliente', contracts: 'contrato', documents: 'documento', users: 'usuario' };
  $('#dialog-title').textContent = `${record ? 'Editar' : 'Nuevo'} ${titleMap[kind]}`;
  $('#dialog-error').textContent = '';
  $('#dialog-submit').textContent = record ? 'Guardar cambios' : 'Crear registro';
  fields.replaceChildren();
  const config = tableConfigForForm(kind);
  let choices = [];
  if (kind === 'contracts') choices = await api('/api/clients');
  if (kind === 'documents') choices = await api('/api/contracts');

  config.forEach(([name, label, type, required, options, wide, hint]) => {
    const wrapper = add(fields, 'div', `field${wide ? ' wide' : ''}`);
    const labelElement = add(wrapper, 'label', '', label);
    const id = `field-${name}`;
    labelElement.htmlFor = id;
    let input;
    if (type === 'textarea') {
      input = add(wrapper, 'textarea');
      input.rows = 3;
    } else if (type === 'select' || type.endsWith('-select')) {
      input = add(wrapper, 'select');
      if (type === 'client-select' || type === 'contract-select') {
        choices.forEach((choice) => {
          const option = add(input, 'option');
          option.value = choice.id;
          option.textContent = type === 'client-select'
            ? `${choice.company} · ${choice.rut || choice.email}`
            : `${choice.number} · ${choice.title}`;
        });
      } else {
        options.forEach((value) => {
          const option = add(input, 'option', '', value);
          option.value = value;
        });
      }
    } else {
      input = add(wrapper, 'input');
      input.type = type;
      if (type === 'number') input.min = '0';
      if (name === 'bankAccount') input.autocomplete = 'off';
    }
    input.id = id;
    input.name = name;
    input.required = Boolean(required);
    if (name === 'password') input.autocomplete = 'new-password';
    if (name === 'bankAccount') {
      input.required = false;
      input.placeholder = record?.bankAccountLast4 ? `Sin cambios · termina en ${record.bankAccountLast4}` : 'Solo dígitos; se cifrará al guardar';
    } else if (record && record[name] !== undefined && name !== 'password') {
      input.value = String(record[name] ?? '');
    }
    if (hint) add(wrapper, 'small', '', hint);
  });

  form.onsubmit = async (event) => {
    event.preventDefault();
    $('#dialog-error').textContent = '';
    const body = Object.fromEntries(new FormData(form).entries());
    if (kind === 'contracts' || kind === 'documents') {
      body[kind === 'contracts' ? 'clientId' : 'contractId'] = Number(body[kind === 'contracts' ? 'clientId' : 'contractId']);
      if (kind === 'contracts') body.value = Number(body.value);
    }
    if (kind === 'users' && record) body.active = body.active === 'true';
    const route = routes[kind];
    const method = record ? (kind === 'users' ? 'PATCH' : 'PUT') : 'POST';
    const url = record ? `${route}/${record.id}` : route;
    try {
      await api(url, { method, body: JSON.stringify(body) });
      dialog.close();
      showNotice(`${titleMap[kind]} ${record ? 'actualizado' : 'creado'} correctamente.`);
      await loadView();
    } catch (error) {
      $('#dialog-error').textContent = error.message;
    }
  };
  dialog.showModal();
  fields.querySelector('input, select, textarea')?.focus();
}

function tableConfigForForm(kind) {
  const clientFields = [
    ['name', 'Nombre de contacto', 'text', true],
    ['company', 'Empresa', 'text', true],
    ['rut', 'RUT', 'text'],
    ['email', 'Correo electrónico', 'email', true],
    ['phone', 'Teléfono', 'tel'],
    ['riskLevel', 'Nivel de riesgo', 'select', true, ['bajo', 'medio', 'alto']],
    ['status', 'Estado', 'select', true, ['activo', 'inactivo']],
    ['bankAccount', 'Cuenta bancaria (cifrada; se muestran solo 4 dígitos)', 'text', false, null, true],
    ['notes', 'Observaciones', 'textarea', false, null, true]
  ];
  const contractFields = [
    ['clientId', 'Cliente', 'client-select', true],
    ['number', 'Número de contrato', 'text', true],
    ['title', 'Título', 'text', true, null, true],
    ['value', 'Monto en pesos chilenos', 'number', true],
    ['status', 'Estado', 'select', true, ['pendiente', 'activo', 'vencido', 'terminado']],
    ['startDate', 'Fecha de inicio', 'date', true],
    ['endDate', 'Fecha de término', 'date', true],
    ['manager', 'Responsable', 'text', true]
  ];
  const documentFields = [
    ['contractId', 'Contrato asociado', 'contract-select', true],
    ['name', 'Nombre del documento', 'text', true, null, true],
    ['category', 'Categoría', 'text', true],
    ['fileName', 'Nombre del archivo (referencia)', 'text'],
    ['status', 'Estado', 'select', true, ['pendiente', 'aprobado', 'rechazado']],
    ['notes', 'Observaciones', 'textarea', false, null, true]
  ];
  const userFields = [
    ['name', 'Nombre completo', 'text', true],
    ['email', 'Correo electrónico', 'email', true],
    ['password', 'Contraseña inicial', 'password', !state.editingId, null, false, '12 caracteres mínimo, mayúscula, minúscula, número y símbolo'],
    ['role', 'Rol', 'select', true, ['admin', 'editor', 'viewer']],
    ['active', 'Cuenta activa', 'select', true, ['true', 'false']]
  ];
  return { clients: clientFields, contracts: contractFields, documents: documentFields, users: userFields }[kind];
}

async function updateUserActive(record) {
  if (record.id === state.user.id && record.active) {
    showNotice('No puedes desactivar tu propia cuenta.', true);
    return;
  }
  const action = record.active ? 'desactivar' : 'activar';
  if (!window.confirm(`¿Quieres ${action} la cuenta de ${record.name}?`)) return;
  try {
    await api(`${routes.users}/${record.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active: !record.active })
    });
    showNotice(`Cuenta ${record.active ? 'desactivada' : 'activada'} correctamente.`);
    await loadView();
  } catch (error) {
    showNotice(error.message, true);
  }
}

async function removeRecord(kind, record) {
  const label = { clients: record.company, contracts: record.number, documents: record.name, users: record.email }[kind];
  if (!window.confirm(`¿Eliminar "${label}"? Esta acción no se puede deshacer.`)) return;
  try {
    await api(`${routes[kind]}/${record.id}`, { method: 'DELETE' });
    showNotice('Registro eliminado correctamente.');
    await loadView();
  } catch (error) {
    showNotice(error.message, true);
  }
}

$('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  $('#login-error').textContent = '';
  const form = new FormData(event.currentTarget);
  try {
    const result = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: form.get('email'), password: form.get('password') })
    });
    setAuthenticated(result.user, result.token);
  } catch (error) {
    $('#login-error').textContent = error.message;
  }
});

$('#main-nav').addEventListener('click', (event) => {
  const button = event.target.closest('[data-view]');
  if (button) navigate(button.dataset.view);
});
$('#logout-button').addEventListener('click', () => logout(''));
$('#menu-button').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
$('#dialog-close').addEventListener('click', () => $('#record-dialog').close());
$('#dialog-cancel').addEventListener('click', () => $('#record-dialog').close());
$('#record-dialog').addEventListener('click', (event) => {
  if (event.target === $('#record-dialog')) $('#record-dialog').close();
});
