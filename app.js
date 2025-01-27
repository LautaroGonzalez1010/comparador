const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar multer para guardar archivos en la carpeta 'uploads'
const upload = multer({ dest: "uploads/" });

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static("public"));

// Función para cargar un inventario desde un archivo Excel
const cargarInventario = (ruta) => {
    const libro = XLSX.readFile(ruta);
    const hoja = libro.Sheets[libro.SheetNames[0]];
    return XLSX.utils.sheet_to_json(hoja);
};

// Función para comparar inventarios
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

// Ruta para manejar la subida de archivos y la comparación
app.post("/comparar", upload.array("inventarios"), (req, res) => {
    try {
        if (!req.files || req.files.length < 2) {
            return res.status(400).send("Debes subir al menos dos archivos Excel.");
        }

        const archivos = req.files.map(file => file.path);
        const resultados = compararInventarios(archivos);

        // Crear archivo Excel de comparación
        const libro = XLSX.utils.book_new();
        ["agregados", "eliminados", "modificados"].forEach(tipo => {
            if (resultados[tipo].length > 0) {
                const hoja = XLSX.utils.json_to_sheet(resultados[tipo]);
                XLSX.utils.book_append_sheet(libro, hoja, tipo.charAt(0).toUpperCase() + tipo.slice(1));
            }
        });

        const archivoResultado = path.join(__dirname, "public", "resultado_comparacion.xlsx");
        XLSX.writeFile(libro, archivoResultado);

        res.download(archivoResultado, "resultado_comparacion.xlsx", () => {
            req.files.forEach(file => fs.unlinkSync(file.path)); // Eliminar archivos temporales
            fs.unlinkSync(archivoResultado); // Eliminar resultado después de la descarga
        });
    } catch (error) {
        console.error("Error durante la comparación:", error);
        res.status(500).send("Error al procesar la comparación.");
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
