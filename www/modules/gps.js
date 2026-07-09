import { db } from './database.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const BANCO_POSTOS = [
    { nome: "UBS Centro", bairro: "Centro", cep: "60000-000", endereco: "Rua Major Facundo, 500", telefone: "(85) 3251-1000", funcionamento: "07:00 às 17:00", vacinas: "BCG, Influenza", lat: -3.7299, lng: -38.5267 },
    { nome: "UBS Messejana", bairro: "Messejana", cep: "60840-000", endereco: "Estrada de Ferro, 120", telefone: "(85) 3452-2000", funcionamento: "07:00 às 19:00", vacinas: "Tríplice Viral, Hepatite B", lat: -3.8261, lng: -38.4883 },
    { nome: "UBS Aldeota", bairro: "Aldeota", cep: "60150-000", endereco: "Avenida Santos Dumont, 1500", telefone: "(85) 3261-3000", funcionamento: "08:00 às 18:00", vacinas: "Influenza, Covid-19", lat: -3.7334, lng: -38.4969 },
    { nome: "UBS Itaitinga Centro", bairro: "Itaitinga", cep: "61880-000", endereco: "Rua Rodolfo Teófilo, 22", telefone: "(85) 3377-1100", funcionamento: "07:00 às 16:00", vacinas: "BCG, Tríplice Viral", lat: -3.9692, lng: -38.5294 },
    { nome: "UBS Barrocão", bairro: "Barrocão", cep: "61880-000", endereco: "Estrada do Barrocão, S/N", telefone: "(85) 3377-1222", funcionamento: "07:00 às 16:00", vacinas: "Hepatite B, Influenza", lat: -3.9307, lng: -38.5425 }
];

let postosCache = null;

function salvarContextoRegional({ bairro = '', cep = '', origem = 'busca' }) {
    const payload = {
        bairro: String(bairro || '').trim(),
        cep: String(cep || '').trim(),
        origem,
        atualizadoEm: new Date().toISOString()
    };

    localStorage.setItem('app_alert_region', JSON.stringify(payload));
}

function formatarKm(km) {
    return `${km.toFixed(1).replace('.', ',')} km`;
}

function obterRaioSelecionadoKm() {
    const select = document.getElementById('filtro-raio-km');
    if (!select) return 0;
    const valor = Number(select.value || '0');
    return Number.isFinite(valor) && valor > 0 ? valor : 0;
}

function haversineKm(lat1, lng1, lat2, lng2) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function limparResultados(container) {
    container.innerHTML = '';
}

function renderizarMensagem(container, html) {
    container.innerHTML = html;
}

function construirDestinoMapa(posto) {
    return posto.lat && posto.lng
        ? `${posto.lat},${posto.lng}`
        : `${posto.nome} ${posto.endereco}`;
}

async function abrirRotaAutomatica(posto) {
    const destino = construirDestinoMapa(posto);

    try {
        const localizacao = await obterLocalizacaoAtual();
        const origem = `${localizacao.lat},${localizacao.lng}`;
        const urlComOrigem = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origem)}&destination=${encodeURIComponent(destino)}&travelmode=driving`;
        window.open(urlComOrigem, '_blank');
        return;
    } catch (error) {
        console.warn('Não foi possível obter localização para rota automática:', error);
    }

    const urlFallback = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}&travelmode=driving`;
    window.open(urlFallback, '_blank');
}

function renderizarPostos(container, postos) {
    limparResultados(container);

    postos.forEach(posto => {
        const cardPosto = document.createElement('div');
        cardPosto.style.cssText = "background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #0275d8; margin-bottom: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); animation: fadeIn 0.2s ease-in-out;";

        cardPosto.innerHTML = `
            <h4 style="margin-bottom: 5px; color: #333;">🏢 ${posto.nome}</h4>
            ${typeof posto.distanciaKm === 'number' ? `<p style="font-size: 13px; color: #0275d8; font-weight: bold; margin-bottom: 6px;">📍 Distância estimada: ${formatarKm(posto.distanciaKm)}</p>` : ''}
            <p style="font-size: 13px; color: #666; margin-bottom: 3px;"><strong>📍 Endereço:</strong> ${posto.endereco} - Bairro ${posto.bairro}</p>
            <p style="font-size: 13px; color: #666; margin-bottom: 3px;"><strong>📞 Telefone:</strong> ${posto.telefone || 'Não informado'}</p>
            <p style="font-size: 13px; color: #0275d8; font-weight: bold; margin-bottom: 8px;">⏳ Horário: ${posto.funcionamento || 'Não informado'}</p>
            ${posto.vacinas ? `<p style="font-size: 13px; color: #444; margin-bottom: 8px;"><strong>💉 Vacinas em estoque:</strong> ${posto.vacinas}</p>` : ''}
            <button type="button" class="btn-ver-rota" style="display: block; width: 100%; text-align: center; background: #0275d8; color: white; padding: 8px; border-radius: 5px; text-decoration: none; font-size: 13px; font-weight: bold; border: none; cursor: pointer;">
                🚗 Ver rota
            </button>
        `;

        const btnVerRota = cardPosto.querySelector('.btn-ver-rota');
        btnVerRota?.addEventListener('click', async () => {
            btnVerRota.disabled = true;
            const textoOriginal = btnVerRota.textContent;
            btnVerRota.textContent = 'Abrindo rota...';

            try {
                await abrirRotaAutomatica(posto);
            } finally {
                btnVerRota.disabled = false;
                btnVerRota.textContent = textoOriginal;
            }
        });

        container.appendChild(cardPosto);
    });
}

async function obterLocalizacaoAtual() {
    const GeolocationPlugin = window.Capacitor?.Plugins?.Geolocation;

    if (GeolocationPlugin) {
        const permissao = await GeolocationPlugin.requestPermissions();
        const status = permissao?.location || permissao?.coarseLocation || permissao?.fineLocation;
        if (status === 'denied') {
            throw new Error('PERMISSAO_NEGADA');
        }

        const pos = await GeolocationPlugin.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 12000
        });

        return {
            lat: pos?.coords?.latitude,
            lng: pos?.coords?.longitude
        };
    }

    if (!navigator.geolocation) {
        throw new Error('GEO_NAO_SUPORTADO');
    }

    return await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 12000 }
        );
    });
}

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

    salvarContextoRegional({
        bairro: isCep ? '' : termoRaw,
        cep: isCep ? apenasDigitos : '',
        origem: 'busca-manual'
    });

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

    limparResultados(containerResultados);

    if (postosEncontrados.length === 0) {
        renderizarMensagem(containerResultados, `
            <div style="padding: 15px; background: #fff3cd; color: #856404; border-radius: 8px; font-size: 14px; text-align: center;">
                ❌ Nenhum posto encontrado para "${termoRaw}". Verifique a ortografia ou tente outro CEP/bairro.
            </div>
        `);
        return;
    }

    renderizarPostos(containerResultados, postosEncontrados);
}

export async function ativarLocalizacaoEListarPostosProximos() {
    const containerResultados = document.getElementById('lista-postos-resultados');
    if (!containerResultados) return;

    renderizarMensagem(containerResultados, `
        <div style="padding: 15px; background: #e8f4ff; color: #005b96; border-radius: 8px; font-size: 14px; text-align: center;">
            📍 Solicitando permissão de localização...
        </div>
    `);

    try {
        const localizacao = await obterLocalizacaoAtual();
        const postosDisponiveis = await carregarPostosFirestore() || BANCO_POSTOS;

        const postosComCoordenadas = postosDisponiveis
            .filter(p => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)))
            .map(p => ({
                ...p,
                lat: Number(p.lat),
                lng: Number(p.lng)
            }));

        if (postosComCoordenadas.length === 0) {
            renderizarMensagem(containerResultados, `
                <div style="padding: 15px; background: #fff3cd; color: #856404; border-radius: 8px; font-size: 14px; text-align: center;">
                    ⚠️ Nenhum posto possui coordenadas geográficas para cálculo de proximidade.
                </div>
            `);
            return;
        }

        const ordenados = postosComCoordenadas
            .map(p => ({
                ...p,
                distanciaKm: haversineKm(localizacao.lat, localizacao.lng, p.lat, p.lng)
            }))
            .sort((a, b) => a.distanciaKm - b.distanciaKm);

        const raioKm = obterRaioSelecionadoKm();
        const filtradosPorRaio = raioKm > 0
            ? ordenados.filter(p => p.distanciaKm <= raioKm)
            : ordenados;

        const topResultados = filtradosPorRaio.slice(0, 5);

        if (topResultados.length === 0) {
            renderizarMensagem(containerResultados, `
                <div style="padding: 15px; background: #fff3cd; color: #856404; border-radius: 8px; font-size: 14px; text-align: center;">
                    ⚠️ Não encontramos postos dentro do raio selecionado (${raioKm} km). Tente aumentar o alcance.
                </div>
            `);
            return;
        }

        const maisProximo = topResultados[0];
        if (maisProximo) {
            salvarContextoRegional({
                bairro: maisProximo.bairro || '',
                cep: (maisProximo.cep || '').replace(/\D/g, ''),
                origem: 'gps'
            });
        }

        renderizarPostos(containerResultados, topResultados);
    } catch (error) {
        console.error('Erro ao obter localização do dispositivo:', error);

        if (error?.message === 'PERMISSAO_NEGADA') {
            renderizarMensagem(containerResultados, `
                <div style="padding: 15px; background: #ffe8e8; color: #a02b2b; border-radius: 8px; font-size: 14px; text-align: center;">
                    ❌ Permissão de localização negada. Ative a permissão para listar os postos mais próximos.
                </div>
            `);
            return;
        }

        renderizarMensagem(containerResultados, `
            <div style="padding: 15px; background: #fff3cd; color: #856404; border-radius: 8px; font-size: 14px; text-align: center;">
                ⚠️ Não foi possível obter a localização agora. Verifique GPS e conexão e tente novamente.
            </div>
        `);
    }
}
