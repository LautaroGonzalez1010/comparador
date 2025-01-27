const compararInventarios = (archivos) => {
    const resultados = { agregados: [], eliminados: [], modificados: [] };

    for (let i = 0; i < archivos.length - 1; i++) {
        const inventarioAnterior = cargarInventario(archivos[i]);
        const inventarioActual = cargarInventario(archivos[i + 1]);

        const anteriorMap = new Map(inventarioAnterior.map(item => [item["Número de Serie"], item]));
        const actualMap = new Map(inventarioActual.map(item => [item["Número de Serie"], item]));

        // Detectar productos agregados
        inventarioActual.forEach(item => {
            if (!anteriorMap.has(item["Número de Serie"])) {
                resultados.agregados.push(item);
            }
        });

        // Detectar productos eliminados
        inventarioAnterior.forEach(item => {
            if (!actualMap.has(item["Número de Serie"])) {
                resultados.eliminados.push(item);
            }
        });

        // Detectar productos modificados asegurando todas las columnas
        inventarioActual.forEach(item => {
            if (anteriorMap.has(item["Número de Serie"])) {
                const previo = anteriorMap.get(item["Número de Serie"]);
                let modificado = false;
                let cambios = {
                    "Número de Serie": item["Número de Serie"],
                    "Componente Antes": previo["Componente"] || "N/A",
                    "Componente Ahora": item["Componente"] || "N/A",
                    "Cantidad Antes": previo["Cantidad"] || "N/A",
                    "Cantidad Ahora": item["Cantidad"] || "N/A",
                    "Ubicación Antes": previo["Ubicación"] || "N/A",
                    "Ubicación Ahora": item["Ubicación"] || "N/A",
                    "Estado Antes": previo["Estado"] || "N/A",
                    "Estado Ahora": item["Estado"] || "N/A",
                };

                // Verificar si hubo algún cambio
                if (
                    cambios["Componente Antes"] !== cambios["Componente Ahora"] ||
                    cambios["Cantidad Antes"] !== cambios["Cantidad Ahora"] ||
                    cambios["Ubicación Antes"] !== cambios["Ubicación Ahora"] ||
                    cambios["Estado Antes"] !== cambios["Estado Ahora"]
                ) {
                    modificado = true;
                }

                if (modificado) {
                    resultados.modificados.push(cambios);
                }
            }
        });
    }

    return resultados;
};
