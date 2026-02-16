const INCIDENT_STORAGE_KEY = "security-incidents-v1";
const ALARM_STORAGE_KEY = "security-alarms-v1";

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
    detectedAt: "2026-02-13T10:10",
    mergedAlarmIds: []
  }
];

const seedAlarms = [
  {
    id: "ALM-2026-1001",
    title: "同一账号异地登录告警",
    type: "异常访问",
    severity: "高",
    source: "SIEM",
    asset: "vpn-gateway",
    status: "未处理",
    description: "账号在10分钟内出现跨国登录行为。",
    detectedAt: "2026-02-16T09:20"
  },
  {
    id: "ALM-2026-1002",
    title: "边界流量突增",
    type: "DDoS",
    severity: "严重",
    source: "WAF",
    asset: "web-gateway",
    status: "未处理",
    description: "入口流量异常升高，峰值达到平时15倍。",
    detectedAt: "2026-02-16T09:35"
  }
];

let incidents = loadData(INCIDENT_STORAGE_KEY, seedIncidents);
let alarms = loadData(ALARM_STORAGE_KEY, seedAlarms);
let pendingMergeAlarmIds = [];

const refs = {
  addIncidentBtn: document.getElementById("addIncidentBtn"),
  incidentDialog: document.getElementById("incidentDialog"),
  incidentForm: document.getElementById("incidentForm"),
  dialogTitle: document.getElementById("dialogTitle"),
  cancelBtn: document.getElementById("cancelBtn"),
  mergedAlarmHint: document.getElementById("mergedAlarmHint"),

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
  sourceChart: document.getElementById("sourceChart"),

  addAlarmBtn: document.getElementById("addAlarmBtn"),
  mergeAlarmsBtn: document.getElementById("mergeAlarmsBtn"),
  alarmTableBody: document.getElementById("alarmTableBody"),
  alarmEmptyHint: document.getElementById("alarmEmptyHint"),

  alarmDialog: document.getElementById("alarmDialog"),
  alarmForm: document.getElementById("alarmForm"),
  alarmDialogTitle: document.getElementById("alarmDialogTitle"),
  alarmCancelBtn: document.getElementById("alarmCancelBtn"),
  alarmId: document.getElementById("alarmId"),
  alarmTitle: document.getElementById("alarmTitle"),
  alarmType: document.getElementById("alarmType"),
  alarmSeverity: document.getElementById("alarmSeverity"),
  alarmSource: document.getElementById("alarmSource"),
  alarmAsset: document.getElementById("alarmAsset"),
  alarmStatus: document.getElementById("alarmStatus"),
  alarmDetectedAt: document.getElementById("alarmDetectedAt"),
  alarmDescription: document.getElementById("alarmDescription")
};

function loadData(key, seed) {
  const fromStorage = localStorage.getItem(key);
  if (!fromStorage) {
    localStorage.setItem(key, JSON.stringify(seed));
    return [...seed];
  }

  try {
    const parsed = JSON.parse(fromStorage);
    return Array.isArray(parsed) ? parsed : [...seed];
  } catch {
    localStorage.setItem(key, JSON.stringify(seed));
    return [...seed];
  }
}

function persistIncidents() {
  localStorage.setItem(INCIDENT_STORAGE_KEY, JSON.stringify(incidents));
}

function persistAlarms() {
  localStorage.setItem(ALARM_STORAGE_KEY, JSON.stringify(alarms));
}

function nextId(prefix) {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const serial = String(Math.floor(Math.random() * 9000) + 1000);
  return `${prefix}-${stamp}-${serial}`;
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
    ["已关闭", closedCount],
    ["告警总数", alarms.length]
  ];

  refs.overviewCards.innerHTML = cards.map(([label, value]) => (
    `<article class="card"><div>${label}</div><div class="value">${value}</div></article>`
  )).join("");
}

function renderIncidentTable(list) {
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
      <td>${(item.mergedAlarmIds || []).length}</td>
      <td>
        <div class="row-actions">
          <button data-action="edit-incident" data-id="${item.id}">编辑</button>
          <button data-action="delete-incident" data-id="${item.id}" class="delete">删除</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function renderAlarmTable() {
  refs.alarmEmptyHint.classList.toggle("hidden", alarms.length > 0);
  refs.alarmTableBody.innerHTML = alarms.map((item) => `
    <tr>
      <td>
        <input type="checkbox" data-action="select-alarm" data-id="${item.id}" ${item.status === "已合并" ? "disabled" : ""}>
      </td>
      <td>${item.id}</td>
      <td>${item.title}</td>
      <td>${item.type}</td>
      <td><span class="badge ${item.severity}">${item.severity}</span></td>
      <td>${item.source}</td>
      <td>${item.asset}</td>
      <td>${item.status}</td>
      <td>${formatDate(item.detectedAt)}</td>
      <td>
        <div class="row-actions">
          <button data-action="edit-alarm" data-id="${item.id}">编辑</button>
          <button data-action="delete-alarm" data-id="${item.id}" class="delete">删除</button>
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
  renderIncidentTable(filtered);
  renderAlarmTable();
  renderCharts(filtered);
}

function openCreateIncidentDialog() {
  refs.dialogTitle.textContent = "新增事件";
  refs.incidentForm.reset();
  refs.incidentId.value = "";
  refs.detectedAt.value = new Date().toISOString().slice(0, 16);
  refs.mergedAlarmHint.classList.add("hidden");
  pendingMergeAlarmIds = [];
  refs.incidentDialog.showModal();
}

function openEditIncidentDialog(id) {
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
  refs.mergedAlarmHint.classList.add("hidden");
  pendingMergeAlarmIds = incident.mergedAlarmIds || [];
  refs.incidentDialog.showModal();
}

function startMergeSelectedAlarms() {
  const checked = [...refs.alarmTableBody.querySelectorAll('input[type="checkbox"][data-action="select-alarm"]:checked')];
  const selectedIds = checked.map((el) => el.dataset.id).filter(Boolean);

  if (selectedIds.length < 2) {
    alert("请至少选择 2 条告警进行合并。\n（单条告警可直接手工创建事件）");
    return;
  }

  const selectedAlarms = alarms.filter((alarm) => selectedIds.includes(alarm.id));
  const severityRank = { 低: 1, 中: 2, 高: 3, 严重: 4 };
  const topSeverity = selectedAlarms.sort((a, b) => severityRank[b.severity] - severityRank[a.severity])[0].severity;

  refs.dialogTitle.textContent = "合并告警提交事件";
  refs.incidentForm.reset();
  refs.incidentId.value = "";
  refs.title.value = `告警合并事件（${selectedAlarms.length}条）`;
  refs.type.value = selectedAlarms[0].type;
  refs.severity.value = topSeverity;
  refs.status.value = "待处理";
  refs.source.value = [...new Set(selectedAlarms.map((a) => a.source))].join(" / ");
  refs.owner.value = "";
  refs.detectedAt.value = new Date().toISOString().slice(0, 16);
  refs.description.value = [
    `由 ${selectedAlarms.length} 条告警合并生成：`,
    ...selectedAlarms.map((a) => `- [${a.id}] ${a.title} | ${a.asset} | ${a.severity}`)
  ].join("\n");

  pendingMergeAlarmIds = selectedIds;
  refs.mergedAlarmHint.textContent = `将合并 ${selectedIds.length} 条告警：${selectedIds.join("、")}`;
  refs.mergedAlarmHint.classList.remove("hidden");
  refs.incidentDialog.showModal();
}

function saveIncident(event) {
  event.preventDefault();
  const payload = {
    id: refs.incidentId.value || nextId("INC"),
    title: refs.title.value.trim(),
    type: refs.type.value,
    severity: refs.severity.value,
    status: refs.status.value,
    source: refs.source.value.trim(),
    owner: refs.owner.value.trim(),
    description: refs.description.value.trim(),
    detectedAt: refs.detectedAt.value,
    mergedAlarmIds: [...pendingMergeAlarmIds]
  };

  if (!payload.title || !payload.source || !payload.owner || !payload.description || !payload.detectedAt) {
    alert("请完整填写事件信息。");
    return;
  }

  const index = incidents.findIndex((i) => i.id === payload.id);
  if (index === -1) {
    incidents.unshift(payload);
  } else {
    incidents[index] = payload;
  }

  if (pendingMergeAlarmIds.length > 0) {
    alarms = alarms.map((alarm) => (
      pendingMergeAlarmIds.includes(alarm.id)
        ? { ...alarm, status: "已合并" }
        : alarm
    ));
    persistAlarms();
  }

  persistIncidents();
  pendingMergeAlarmIds = [];
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

function openCreateAlarmDialog() {
  refs.alarmDialogTitle.textContent = "新增告警";
  refs.alarmForm.reset();
  refs.alarmId.value = "";
  refs.alarmDetectedAt.value = new Date().toISOString().slice(0, 16);
  refs.alarmDialog.showModal();
}

function openEditAlarmDialog(id) {
  const alarm = alarms.find((a) => a.id === id);
  if (!alarm) return;

  refs.alarmDialogTitle.textContent = "编辑告警";
  refs.alarmId.value = alarm.id;
  refs.alarmTitle.value = alarm.title;
  refs.alarmType.value = alarm.type;
  refs.alarmSeverity.value = alarm.severity;
  refs.alarmSource.value = alarm.source;
  refs.alarmAsset.value = alarm.asset;
  refs.alarmStatus.value = alarm.status;
  refs.alarmDetectedAt.value = alarm.detectedAt;
  refs.alarmDescription.value = alarm.description;
  refs.alarmDialog.showModal();
}

function saveAlarm(event) {
  event.preventDefault();
  const payload = {
    id: refs.alarmId.value || nextId("ALM"),
    title: refs.alarmTitle.value.trim(),
    type: refs.alarmType.value,
    severity: refs.alarmSeverity.value,
    source: refs.alarmSource.value.trim(),
    asset: refs.alarmAsset.value.trim(),
    status: refs.alarmStatus.value,
    detectedAt: refs.alarmDetectedAt.value,
    description: refs.alarmDescription.value.trim()
  };

  if (!payload.title || !payload.source || !payload.asset || !payload.detectedAt || !payload.description) {
    alert("请完整填写告警信息。");
    return;
  }

  const index = alarms.findIndex((a) => a.id === payload.id);
  if (index === -1) {
    alarms.unshift(payload);
  } else {
    alarms[index] = payload;
  }

  persistAlarms();
  refs.alarmDialog.close();
  rerender();
}

function deleteAlarm(id) {
  if (!confirm(`确认删除告警 ${id} 吗？`)) {
    return;
  }

  alarms = alarms.filter((a) => a.id !== id);
  persistAlarms();
  rerender();
}

function initEvents() {
  refs.addIncidentBtn.addEventListener("click", openCreateIncidentDialog);
  refs.cancelBtn.addEventListener("click", () => {
    pendingMergeAlarmIds = [];
    refs.incidentDialog.close();
  });
  refs.incidentForm.addEventListener("submit", saveIncident);

  refs.addAlarmBtn.addEventListener("click", openCreateAlarmDialog);
  refs.alarmCancelBtn.addEventListener("click", () => refs.alarmDialog.close());
  refs.alarmForm.addEventListener("submit", saveAlarm);
  refs.mergeAlarmsBtn.addEventListener("click", startMergeSelectedAlarms);

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
    if (action === "edit-incident") openEditIncidentDialog(id);
    if (action === "delete-incident") deleteIncident(id);
  });

  refs.alarmTableBody.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.action;
    const id = target.dataset.id;
    if (!action || !id) return;
    if (action === "edit-alarm") openEditAlarmDialog(id);
    if (action === "delete-alarm") deleteAlarm(id);
  });
}

initEvents();
rerender();
