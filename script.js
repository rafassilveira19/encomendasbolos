const firebaseConfig = {
  apiKey: "AIzaSyBM94SV8JU1dsuHl_SxChg4m_OmvNC0WqM",
  authDomain: "encomendas-afe75.firebaseapp.com",
  projectId: "encomendas-afe75",
  storageBucket: "encomendas-afe75.firebasestorage.app",
  messagingSenderId: "271558647148",
  appId: "1:271558647148:web:46eb123860c9efb2dfe749",
  measurementId: "G-S9DWGLFT0H"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const pedidosCollection = db.collection('pedidos');

const form = document.getElementById('pedidoForm');
const divAtivos = document.getElementById('ativos');
const tabelaFinalizados = document.getElementById('tabelaFinalizados').querySelector('tbody');
const btnImprimir = document.getElementById('imprimir');
const abaAtivos = document.getElementById('abaAtivos');
const abaFinalizados = document.getElementById('abaFinalizados');
const divFinalizados = document.getElementById('finalizados');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nome = document.getElementById('nome').value;
  const pedido = document.getElementById('pedido').value;
  const tamanho = document.getElementById('tamanho').value;
  const dataInput = document.getElementById('data').value; // yyyy-mm-dd
  const hora = document.getElementById('hora').value;
  const entrega = document.getElementById('entrega').value;
  const observacao = document.getElementById('observacao').value;

  if(!dataInput) {
    alert("Selecione uma data válida!");
    return;
  }

  const [ano, mes, dia] = dataInput.split('-');
  const dataFormatada = `${dia}/${mes}/${ano}`; // para exibição
  const dataOrdenacao = parseInt(`${ano}${mes}${dia}`); // para ordenação

  try {
    await pedidosCollection.add({
      nome,
      pedido,
      tamanho,
      data: dataFormatada,
      dataOrdenacao,
      hora,
      entrega,
      observacao,
      entregue: false,
      createdAt: firebase.firestore.Timestamp.now()
    });
    form.reset();
  } catch(err) {
    console.error("Erro ao adicionar pedido:", err);
  }
});

// Troca de abas
abaAtivos.addEventListener('click', () => {
  divAtivos.style.display = 'block';
  divFinalizados.style.display = 'none';
});
abaFinalizados.addEventListener('click', () => {
  divAtivos.style.display = 'none';
  divFinalizados.style.display = 'block';
});

// Atualização em tempo real
pedidosCollection.onSnapshot((snapshot) => {
  const pedidosData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  atualizarTabelasFirebase(pedidosData);
  atualizarFinalizadosFirebase(pedidosData);
});

// Atualiza tabela de pedidos ativos
function atualizarTabelasFirebase(pedidosData) {
  divAtivos.querySelectorAll('.tabelaData').forEach(el => el.remove());

  const pedidosAtivos = pedidosData.filter(p => !p.entregue);
  pedidosAtivos.sort((a, b) => a.dataOrdenacao - b.dataOrdenacao);

  const pedidosPorData = {};
  pedidosAtivos.forEach(p => {
    if(!pedidosPorData[p.data]) pedidosPorData[p.data] = [];
    pedidosPorData[p.data].push(p);
  });

  for (const data of Object.keys(pedidosPorData).sort()) {
    const container = document.createElement('div');
    container.className = 'tabelaData';

    const titulo = document.createElement('h3');
    titulo.textContent = data;
    container.appendChild(titulo);

    const tabela = document.createElement('table');
    tabela.innerHTML = `
      <thead>
        <tr>
          <th>Nome</th>
          <th>Bolo</th>
          <th>Tamanho</th>
          <th>Hora</th>
          <th>Entrega</th>
          <th>Observação</th>
          <th>Entregue</th>
          <th>Excluir</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    container.appendChild(tabela);
    divAtivos.appendChild(container);

    const tbody = tabela.querySelector('tbody');
    pedidosPorData[data].forEach(p => {
      const linha = document.createElement('tr');
      linha.innerHTML = `
        <td>${p.nome}</td>
        <td>${p.pedido}</td>
        <td>${p.tamanho}</td>
        <td>${p.hora}</td>
        <td>${p.entrega}</td>
        <td>${p.observacao}</td>
        <td><input type="checkbox" data-id="${p.id}" ${p.entregue ? 'checked' : ''}></td>
        <td><button class="excluir" data-id="${p.id}">Excluir</button></td>
      `;
      tbody.appendChild(linha);
    });
  }
}

// Atualiza tabela de pedidos finalizados
function atualizarFinalizadosFirebase(pedidosData) {
  tabelaFinalizados.innerHTML = '';
  const finalizados = pedidosData.filter(p => p.entregue);
  finalizados.sort((a,b) => a.dataOrdenacao - b.dataOrdenacao);

  finalizados.forEach(p => {
    const linha = document.createElement('tr');
    linha.innerHTML = `
      <td>${p.nome}</td>
      <td>${p.pedido}</td>
      <td>${p.tamanho}</td>
      <td>${p.data}</td>
      <td>${p.hora}</td>
      <td>${p.entrega}</td>
      <td>${p.observacao}</td>
      <td>
        <button class="voltar" data-id="${p.id}">Voltar</button>
        <button class="excluir" data-id="${p.id}">Excluir</button>
      </td>
    `;
    tabelaFinalizados.appendChild(linha);
  });
}

// Marcar como entregue
divAtivos.addEventListener('change', async (e) => {
  if(e.target.type === 'checkbox') {
    const id = e.target.dataset.id;
    await pedidosCollection.doc(id).update({ entregue: e.target.checked });
  }
});

// Excluir pedido
divAtivos.addEventListener('click', async (e) => {
  if(e.target.classList.contains('excluir')) {
    await excluirPedido(e.target.dataset.id);
  }
});
divFinalizados.addEventListener('click', async (e) => {
  const id = e.target.dataset.id;
  if(e.target.classList.contains('voltar')) {
    await pedidosCollection.doc(id).update({ entregue: false });
  } else if(e.target.classList.contains('excluir')) {
    await excluirPedido(id);
  }
});

async function excluirPedido(id) {
  if(confirm('Deseja realmente excluir este pedido?')) {
    await pedidosCollection.doc(id).delete();
  }
}

// Impressão
btnImprimir.addEventListener('click', () => {
  const printWindow = window.open('', '', 'width=900,height=600');

  pedidosCollection.get().then(snapshot => {
    const pedidosAtivos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(p => !p.entregue)
      .sort((a,b)=>a.dataOrdenacao - b.dataOrdenacao);

    const pedidosPorData = {};
    pedidosAtivos.forEach(p => {
      if(!pedidosPorData[p.data]) pedidosPorData[p.data] = [];
      pedidosPorData[p.data].push(p);
    });

    let html = `
      <html>
      <head>
        <title>Pedidos Ativos</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background: #fff; color: #333; }
          h2 { color: #d06e9e; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { padding: 10px; border: 1px solid #d06e9e; text-align: left; }
          th { background-color: #d06e9e; color: white; }
          tr:nth-child(even) { background-color: #ffe6f0; }
        </style>
      </head>
      <body>
        <h1>Pedidos Ativos</h1>
    `;

    for (const data of Object.keys(pedidosPorData).sort()) {
      html += `<h2>${data}</h2>`;
      html += `<table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Bolo</th>
            <th>Tamanho</th>
            <th>Horário</th>
            <th>Entrega/Retirada</th>
          </tr>
        </thead>
        <tbody>
      `;
      pedidosPorData[data].forEach(p => {
        html += `<tr>
          <td>${p.nome}</td>
          <td>${p.pedido}</td>
          <td>${p.tamanho}</td>
          <td>${p.hora}</td>
          <td>${p.entrega}</td>
        </tr>`;
      });
      html += `</tbody></table>`;
    }

    html += `</body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  });
});
