async function refreshData() {
  try {
    const statusResponse = await fetch('/api/status');
    const statusData = await statusResponse.json();

    const statusCard = document.getElementById('statusCard');
    const statusText = document.getElementById('statusText');
    const deviceName = document.getElementById('deviceName');
    const lastUpdated = document.getElementById('lastUpdated');

    statusCard.classList.remove('ok', 'alert');

    deviceName.textContent = statusData.deviceName || '—';

    lastUpdated.textContent = statusData.lastUpdated
      ? new Date(statusData.lastUpdated).toLocaleString()
      : '—';

    if (statusData.currentStatus === 'OPEN') {
      statusCard.classList.add('alert');
      statusText.textContent = 'ТРИВОГА: ВІДЧИНЕНО';
    } else if (statusData.currentStatus === 'CLOSED') {
      statusCard.classList.add('ok');
      statusText.textContent = 'БЕЗПЕЧНО';
    } else {
      statusText.textContent = 'НЕМАЄ ДАНИХ';
    }

    const logsResponse = await fetch('/api/logs');
    const logs = await logsResponse.json();

    const tbody = document.getElementById('logsTableBody');

    if (!logs || logs.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4">Немає записів</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = logs.map(log => `
      <tr>
        <td>${log.id}</td>
        <td>${log.deviceName}</td>
        <td class="${log.statusValue === 'OPEN' ? 'status-open' : 'status-closed'}">
          ${log.statusValue}
        </td>
        <td>${new Date(log.eventTime).toLocaleString()}</td>
      </tr>
    `).join('');

  } catch (error) {
    console.error('Помилка оновлення:', error);
  }
}

refreshData();
setInterval(refreshData, 2000);