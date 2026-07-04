export function mudarAba(targetId, elementoBotao) {
    document.querySelectorAll('.sub-screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(`screen-${targetId}`).classList.remove('hidden');
    
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    elementoBotao.classList.add('active');

    const titulos = { 
        dashboard: "Painel Principal", 
        calendar: "Calendário Oficial", 
        wallet: "Minha Carteira", 
        reminders: "Lembretes" 
    };
    document.getElementById('app-title').innerText = titulos[targetId];
}
