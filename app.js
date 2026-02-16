const STORAGE_KEY = "security-incidents-v1";

const seedIncidents = [
  {
    id: "INC-2026-0001",
    title: "钓鱼邮件触发账号泄露风险",
    type: "钓鱼攻击",
    severity: "高",
    status: "处理中",
    source: "邮件安全网关",
    owner: "李明",
    description: "多名员工收到伪造财务通知邮件并点击链接。",
    detectedAt: "2026-02-13T10:10"
  },
  {
    id: "INC-2026-0002",
    title: "外网主机疑似DDoS流量突增",
    type: "DDoS",
    severity: "严重",
    status: "待处理",
    source: "WAF",
    owner: "王蕾",
    description: "边界流量在5分钟内增长到平时的18倍。",
    detectedAt: "2026-02-14T19:20"
  },
  {
    id: "INC-2026-0003",
    title: "终端检测到恶意木马样本",
    type: "恶意软件",
    severity: "中",
    status: "已处置",
    source: "EDR",
    owner: "赵阳",
    description: "某终端下载并执行可疑附件，已隔离。",
    detectedAt: "2026-02-15T08:42"
  }
];

let incidents = loadIncidents();

const refs = {
  addIncidentBtn: document.getElementById("addIncidentBtn"),
  incidentDialog: document.getElementById("incidentDialog"),
  incidentForm: document.getElementById("incidentForm"),
  dialogTitle: document.getElementById("dialogTitle"),
  cancelBtn: document.getElementById("cancelBtn"),
  incidentId: document.getElementById("incidentId"),
  title: document.getElementById("title"),
  type: document.getElementById("type"),
  severity: document.getElementById("severity"),
  status: document.getElementById("status"),
  source: document.getElementById("source"),
  owner: document.getElementById("owner"),
  description: document.getElementById("description"),
  detectedAt: document.getElementById("detectedAt"),
  searchInput: document.getElementById("searchInput"),
  severityFilter: document.getElementById("severityFilter"),
  statusFilter: document.getElementById("statusFilter"),
  typeFilter: document.getElementById("typeFilter"),
  ownerFilter: document.getElementById("ownerFilter"),
  resetFiltersBtn: document.getElementById("resetFiltersBtn"),
  incidentTableBody: document.getElementById("incidentTableBody"),
  emptyHint: document.getElementById("emptyHint"),
  overviewCards: document.getElementById("overviewCards"),
  severityChart: document.getElementById("severityChart"),
  statusChart: document.getElementById("statusChart"),
  typeChart: document.getElementById("typeChart"),
  sourceChart: document.getElementById("sourceChart")
};

function loadIncidents() {
  const fromStorage = localStorage.getItem(STORAGE_KEY);
  if (!fromStorage) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedIncidents));
    return [...seedIncidents];
  }

  try {
    const parsed = JSON.parse(fromStorage);
    return Array.isArray(parsed) ? parsed : [...seedIncidents];
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedIncidents));
    return [...seedIncidents];
  }
}

function persistIncidents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(incidents));
}

function nextId() {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const serial = String(Math.floor(Math.random() * 9000) + 1000);
  return `INC-${stamp}-${serial}`;
}

function getFilters() {
  return {
    keyword: refs.searchInput.value.trim().toLowerCase(),
    severity: refs.severityFilter.value,
    status: refs.statusFilter.value,
    type: refs.typeFilter.value,
    owner: refs.ownerFilter.value.trim().toLowerCase()
  };
}

function applyFilters(list) {
  const f = getFilters();
  return list.filter((item) => {
    const searchable = `${item.id} ${item.title} ${item.description}`.toLowerCase();
    return (f.keyword ? searchable.includes(f.keyword) : true)
      && (f.severity === "all" ? true : item.severity === f.severity)
      && (f.status === "all" ? true : item.status === f.status)
      && (f.type === "all" ? true : item.type === f.type)
      && (f.owner ? item.owner.toLowerCase().includes(f.owner) : true);
  });
}

function renderOverview(list) {
  const severeCount = list.filter((i) => i.severity === "严重").length;
  const pendingCount = list.filter((i) => i.status === "待处理").length;
  const inProgressCount = list.filter((i) => i.status === "处理中").length;
  const closedCount = list.filter((i) => i.status === "已关闭").length;

  const cards = [
    ["事件总数", list.length],
    ["严重事件", severeCount],
    ["待处理", pendingCount],
    ["处理中", inProgressCount],
    ["已关闭", closedCount]
  ];

  refs.overviewCards.innerHTML = cards.map(([label, value]) => (
    `<article class="card"><div>${label}</div><div class="value">${value}</div></article>`
  )).join("");
}

function renderTable(list) {
  refs.emptyHint.classList.toggle("hidden", list.length > 0);
  refs.incidentTableBody.innerHTML = list.map((item) => `
    <tr>
      <td>${item.id}</td>
      <td>${item.title}</td>
      <td>${item.type}</td>
      <td><span class="badge ${item.severity}">${item.severity}</span></td>
      <td>${item.status}</td>
      <td>${item.source}</td>
      <td>${item.owner}</td>
      <td>${formatDate(item.detectedAt)}</td>
      <td>
        <div class="row-actions">
          <button data-action="edit" data-id="${item.id}">编辑</button>
          <button data-action="delete" data-id="${item.id}" class="delete">删除</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function groupCount(list, field, order = []) {
  const map = list.reduce((acc, item) => {
    acc[item[field]] = (acc[item[field]] || 0) + 1;
    return acc;
  }, {});

  const keys = Object.keys(map);
  if (order.length > 0) {
    keys.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  } else {
    keys.sort((a, b) => map[b] - map[a]);
  }

  return keys.map((key) => ({ label: key, value: map[key] }));
}

function renderBars(container, data) {
  const max = Math.max(...data.map((d) => d.value), 1);
  container.innerHTML = data.map(({ label, value }) => {
    const pct = Math.round((value / max) * 100);
    return `
      <div class="bar-row">
        <span>${label}</span>
        <div class="bar"><span style="width:${pct}%"></span></div>
        <strong>${value}</strong>
      </div>
    `;
  }).join("") || "<p class='empty'>暂无数据</p>";
}

function renderCharts(list) {
  renderBars(refs.severityChart, groupCount(list, "severity", ["严重", "高", "中", "低"]));
  renderBars(refs.statusChart, groupCount(list, "status", ["待处理", "处理中", "已处置", "已关闭"]));
  renderBars(refs.typeChart, groupCount(list, "type"));
  renderBars(refs.sourceChart, groupCount(list, "source"));
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("zh-CN", { hour12: false });
}

function rerender() {
  const filtered = applyFilters(incidents);
  renderOverview(filtered);
  renderTable(filtered);
  renderCharts(filtered);
}

function openCreateDialog() {
  refs.dialogTitle.textContent = "新增事件";
  refs.incidentForm.reset();
  refs.incidentId.value = "";
  refs.detectedAt.value = new Date().toISOString().slice(0, 16);
  refs.incidentDialog.showModal();
}

function openEditDialog(id) {
  const incident = incidents.find((i) => i.id === id);
  if (!incident) return;

  refs.dialogTitle.textContent = "编辑事件";
  refs.incidentId.value = incident.id;
  refs.title.value = incident.title;
  refs.type.value = incident.type;
  refs.severity.value = incident.severity;
  refs.status.value = incident.status;
  refs.source.value = incident.source;
  refs.owner.value = incident.owner;
  refs.description.value = incident.description;
  refs.detectedAt.value = incident.detectedAt;
  refs.incidentDialog.showModal();
}

function saveIncident(event) {
  event.preventDefault();
  const payload = {
    id: refs.incidentId.value || nextId(),
    title: refs.title.value.trim(),
    type: refs.type.value,
    severity: refs.severity.value,
    status: refs.status.value,
    source: refs.source.value.trim(),
    owner: refs.owner.value.trim(),
    description: refs.description.value.trim(),
    detectedAt: refs.detectedAt.value
  };

  if (!payload.title || !payload.source || !payload.owner || !payload.description || !payload.detectedAt) {
    return;
  }

  const index = incidents.findIndex((i) => i.id === payload.id);
  if (index === -1) {
    incidents.unshift(payload);
  } else {
    incidents[index] = payload;
  }

  persistIncidents();
  refs.incidentDialog.close();
  rerender();
}

function deleteIncident(id) {
  if (!confirm(`确认删除事件 ${id} 吗？`)) {
    return;
  }
  incidents = incidents.filter((item) => item.id !== id);
  persistIncidents();
  rerender();
}

function initEvents() {
  refs.addIncidentBtn.addEventListener("click", openCreateDialog);
  refs.cancelBtn.addEventListener("click", () => refs.incidentDialog.close());
  refs.incidentForm.addEventListener("submit", saveIncident);

  [refs.searchInput, refs.severityFilter, refs.statusFilter, refs.typeFilter, refs.ownerFilter]
    .forEach((el) => el.addEventListener("input", rerender));

  refs.resetFiltersBtn.addEventListener("click", () => {
    refs.searchInput.value = "";
    refs.severityFilter.value = "all";
    refs.statusFilter.value = "all";
    refs.typeFilter.value = "all";
    refs.ownerFilter.value = "";
    rerender();
  });

  refs.incidentTableBody.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.action;
    const id = target.dataset.id;
    if (!action || !id) return;
    if (action === "edit") openEditDialog(id);
    if (action === "delete") deleteIncident(id);
  });
}

initEvents();
rerender();
