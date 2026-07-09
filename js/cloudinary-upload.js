(function () {
  "use strict";

  /* =====================================================================
     CONFIGURACIÓN CLOUDINARY
     ---------------------------------------------------------------------
     1. Entrá a https://console.cloudinary.com/  → Settings → Upload
     2. "Add upload preset" → Signing Mode: UNSIGNED → guardalo
        (ej. de nombre: huella_unsigned) → Save
     3. Pegá ese nombre acá abajo en UPLOAD_PRESET.
     ===================================================================== */
  var CLOUD_NAME = "huella-posada";
  var UPLOAD_PRESET = "huella_unsigned"; // ⚠️ reemplazar por el preset unsigned real

  var UPLOAD_URL = "https://api.cloudinary.com/v1_1/" + CLOUD_NAME + "/image/upload";

  /**
   * Sube una imagen a Cloudinary.
   * @param {File} file
   * @param {function(number):void} [onProgress] 0-100
   * @returns {Promise<string>} URL segura de la imagen subida
   */
  function uploadImage(file, onProgress) {
    return new Promise(function (resolve, reject) {
      if (!file) { reject(new Error("No hay archivo")); return; }
      if (!/^image\//.test(file.type)) { reject(new Error("El archivo debe ser una imagen")); return; }
      if (file.size > 10 * 1024 * 1024) { reject(new Error("La imagen pesa más de 10MB")); return; }

      var formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);

      var xhr = new XMLHttpRequest();
      xhr.open("POST", UPLOAD_URL, true);

      xhr.upload.onprogress = function (e) {
        if (onProgress && e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = function () {
        try {
          var res = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && res.secure_url) {
            resolve(res.secure_url);
          } else {
            reject(new Error((res.error && res.error.message) || "Error al subir la imagen"));
          }
        } catch (e) {
          reject(new Error("Respuesta inválida de Cloudinary"));
        }
      };

      xhr.onerror = function () { reject(new Error("Error de red al subir la imagen")); };
      xhr.send(formData);
    });
  }

  window.huellaCloudinary = { uploadImage: uploadImage };
})();
