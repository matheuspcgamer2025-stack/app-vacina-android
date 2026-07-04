// Banco de dados simulado de Unidades Básicas de Saúde (UBS) de Referência
const BANCO_POSTOS = [
    { nome: "UBS Centro", bairro: "Centro", cep: "60000-000", endereco: "Rua Major Facundo, 500", telefone: "(85) 3251-1000", funcionamento: "07:00 às 17:00" },
    { nome: "UBS Messejana", bairro: "Messejana", cep: "60840-000", endereco: "Estrada de Ferro, 120", telefone: "(85) 3452-2000", funcionamento: "07:00 às 19:00" },
    { nome: "UBS Aldeota", bairro: "Aldeota", cep: "60150-000", endereco: "Avenida Santos Dumont, 1500", telefone: "(85) 3261-3000", funcionamento: "08:00 às 18:00" },
    { nome: "UBS Itaitinga Centro", bairro: "Itaitinga", cep: "61880-000", endereco: "Rua Rodolfo Teófilo, 22", telefone: "(85) 3377-1100", funcionamento: "07:00 às 16:00" },
    { nome: "UBS Barrocão", bairro: "Barrocão", cep: "61880-000", endereco: "Estrada do Barrocão, S/N", telefone: "(85) 3377-1222", funcionamento: "07:00 às 16:00" }
];

export function buscarEExibirPosto() {
    const termoBusca = document.getElementById('input-busca-local').value.trim().toLowerCase();
    const containerResultados = document.getElementById('lista-postos-resultados');

    if (!termoBusca) {
        alert("Por favor, digite um bairro ou CEP para realizar a busca.");
        return;
    }

    // Filtra os postos combinando o texto digitado com o Bairro ou o CEP do banco
    const postosEncontrados = BANCO_POSTOS.filter(posto => {
        return posto.bairro.toLowerCase().includes(termoBusca) || posto.cep.replace('-', '').includes(termoBusca);
    });

    containerResultados.innerHTML = "";

    if (postosEncontrados.length === 0) {
        containerResultados.innerHTML = `
            <div style="padding: 15px; background: #fff3cd; color: #856404; border-radius: 8px; font-size: 14px; text-align: center;">
                ❌ Nenhum posto encontrado para "${termoBusca}". Tente buscar por "Itaitinga", "Centro" ou "Messejana".
            </div>
        `;
        return;
    }

    // Injeta os cards de cada posto encontrado diretamente na tela
    postosEncontrados.forEach(posto => {
        const cardPosto = document.createElement('div');
        cardPosto.style.cssText = "background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #0275d8; margin-bottom: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); animation: fadeIn 0.2s ease-in-out;";
        
        cardPosto.innerHTML = `
            <h4 style="margin-bottom: 5px; color: #333;">🏢 ${posto.nome}</h4>
            <p style="font-size: 13px; color: #666; margin-bottom: 3px;">📍 <strong>Endereço:</strong> ${posto.endereco} - Bairro ${posto.bairro}</p>
            <p style="font-size: 13px; color: #666; margin-bottom: 3px;">📞 <strong>Telefone:</strong> ${posto.telefone}</p>
            <p style="font-size: 13px; color: #0275d8; font-weight: bold; margin-bottom: 8px;">⏳ Horário: ${posto.funcionamento}</p>
            <a href="https://google.com{encodeURIComponent(posto.nome + ' ' + posto.endereco)}" target="_blank" style="display: block; text-align: center; background: #0275d8; color: white; padding: 8px; border-radius: 5px; text-decoration: none; font-size: 13px; font-weight: bold;">
                🚗 Abrir Rota no GPS do Celular
            </a>
        `;
        containerResultados.appendChild(cardPosto);
    });
}
