export function criarBarraCategoria(titulo, atual, total, cor) {
    const porcentagem = total > 0 ? Math.round((atual / total) * 100) : 0;
    
    return `
        <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
                <span>${titulo}</span>
                <strong>${atual}/${total} (${porcentagem}%)</strong>
            </div>
            <div style="background: #e9ecef; border-radius: 10px; overflow: hidden; height: 8px;">
                <div style="background: ${cor}; width: ${porcentagem}%; height: 100%; transition: width 0.4s;"></div>
            </div>
        </div>
    `;
}
