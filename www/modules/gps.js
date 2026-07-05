import { db } from './database.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const BANCO_POSTOS = [
    { nome: "UBS Centro", bairro: "Centro", cep: "60000-000", endereco: "Rua Major Facundo, 500", telefone: "(85) 3251-1000", funcionamento: "07:00 às 17:00", vacinas: "BCG, Influenza" },
    { nome: "UBS Messejana", bairro: "Messejana", cep: "60840-000", endereco: "Estrada de Ferro, 120", telefone: "(85) 3452-2000", funcionamento: "07:00 às 19:00", vacinas: "Tríplice Viral, Hepatite B" },
    { nome: "UBS Aldeota", bairro: "Aldeota", cep: "60150-000", endereco: "Avenida Santos Dumont, 1500", telefone: "(85) 3261-3000", funcionamento: "08:00 às 18:00", vacinas: "Influenza, Covid-19" },
    { nome: "UBS Itaitinga Centro", bairro: "Itaitinga", cep: "61880-000", endereco: "Rua Rodolfo Teófilo, 22", telefone: "(85) 3377-1100", funcionamento: "07:00 às 16:00", vacinas: "BCG, Tríplice Viral" },
    { nome: "UBS Barrocão", bairro: "Barrocão", cep: "61880-000", endereco: "Estrada do Barrocão, S/N", telefone: "(85) 3377-1222", funcionamento: "07:00 às 16:00", vacinas: "Hepatite B, Influenza" }
];

let postosCache = null;

async function carregarPostosFirestore() {
    if (postosCache) return postosCache;

    try {
        const snapshot = await getDocs(collection(db, 'postos'));
        const resultados = [];
        snapshot.forEach(doc => resultados.push({ id: doc.id, ...doc.data() }));
        if (resultados.length > 0) {
            postosCache = resultados;
            return resultados;
        }
    } catch (error) {
        console.error('Erro ao carregar postos do Firestore:', error);
    }

    return null;
}

export async function buscarEExibirPosto() {
    const termoRaw = document.getElementById('input-busca-local').value.trim();
    const termoBusca = termoRaw.toLowerCase();
    const containerResultados = document.getElementById('lista-postos-resultados');

    if (!termoRaw) {
        alert("Por favor, digite um bairro ou CEP para realizar a busca.");
        return;
    }

    // Determina se o usuário digitou um CEP (apenas números) ou um texto de bairro/nome
    const apenasDigitos = termoRaw.replace(/\D/g, '');
    const isCep = apenasDigitos.length >= 5; // considera CEP se tiver 5 ou mais dígitos

    // Para buscas por texto, exige pelo menos 3 caracteres úteis para evitar resultados triviais
    if (!isCep && termoBusca.length < 3) {
        containerResultados.innerHTML = `
            <div style="padding: 15px; background: #fff3cd; color: #856404; border-radius: 8px; font-size: 14px; text-align: center;">
                ℹ️ Digite pelo menos 3 caracteres do bairro ou 5 dígitos do CEP para pesquisar.
            </div>
        `;
        return;
    }

    const postosDisponiveis = await carregarPostosFirestore() || BANCO_POSTOS;

    // Busca mais restrita: se for CEP, compara apenas dígitos; se for texto, exige correspondência relevante
    const postosEncontrados = postosDisponiveis.filter(posto => {
        if (isCep) {
            const cepSem = (posto.cep || '').replace(/\D/g, '');
            return cepSem.includes(apenasDigitos);
        }

        // campos a serem pesquisados
        const campos = [posto.nome, posto.bairro, posto.endereco, posto.vacinas, posto.funcionamento]
            .filter(Boolean)
            .map(s => s.toLowerCase());

        // verifica se qualquer campo contém a string de busca (requisição mínima já feita)
        return campos.some(c => c.includes(termoBusca));
    });

    containerResultados.innerHTML = "";

    if (postosEncontrados.length === 0) {
        containerResultados.innerHTML = `
            <div style="padding: 15px; background: #fff3cd; color: #856404; border-radius: 8px; font-size: 14px; text-align: center;">
                ❌ Nenhum posto encontrado para "${termoRaw}". Verifique a ortografia ou tente outro CEP/bairro.
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
            <p style="font-size: 13px; color: #666; margin-bottom: 3px;"><strong>📍 Endereço:</strong> ${posto.endereco} - Bairro ${posto.bairro}</p>
            <p style="font-size: 13px; color: #666; margin-bottom: 3px;"><strong>📞 Telefone:</strong> ${posto.telefone || 'Não informado'}</p>
            <p style="font-size: 13px; color: #0275d8; font-weight: bold; margin-bottom: 8px;">⏳ Horário: ${posto.funcionamento || 'Não informado'}</p>
            ${posto.vacinas ? `<p style="font-size: 13px; color: #444; margin-bottom: 8px;"><strong>💉 Vacinas em estoque:</strong> ${posto.vacinas}</p>` : ''}
            <a href="https://google.com/maps/dir/?api=1&destination=${encodeURIComponent(posto.lat && posto.lng ? `${posto.lat},${posto.lng}` : posto.nome + ' ' + posto.endereco)}" target="_blank" style="display: block; text-align: center; background: #0275d8; color: white; padding: 8px; border-radius: 5px; text-decoration: none; font-size: 13px; font-weight: bold;">
                🚗 Ver no GPS
            </a>
        `;
        containerResultados.appendChild(cardPosto);
    });
}
