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
  var CLOUD_NAME = "dmdpzjwom";
  var UPLOAD_PRESET = "huella_unsigned"; // ⚠️ reemplazar por el preset unsigned real

  var MAX_IMAGE_BYTES = 10 * 1024 * 1024;   // 10MB
  var MAX_VIDEO_BYTES = 100 * 1024 * 1024;  // 100MB

  function uploadUrlFor(resourceType) {
    return "https://api.cloudinary.com/v1_1/" + CLOUD_NAME + "/" + resourceType + "/upload";
  }

  /**
   * Sube un archivo (imagen o video) a Cloudinary.
   * @param {File} file
   * @param {string} resourceType "image" | "video"
   * @param {function(number):void} [onProgress] 0-100
   * @returns {Promise<string>} URL segura del archivo subido
   */
  function uploadMedia(file, resourceType, onProgress) {
    return new Promise(function (resolve, reject) {
      if (!file) { reject(new Error("No hay archivo")); return; }

      var isImage = /^image\//.test(file.type);
      var isVideo = /^video\//.test(file.type);

      if (resourceType === "video") {
        if (!isVideo) { reject(new Error("El archivo debe ser un video")); return; }
        if (file.size > MAX_VIDEO_BYTES) { reject(new Error("El video pesa más de 100MB")); return; }
      } else {
        resourceType = "image";
        if (!isImage) { reject(new Error("El archivo debe ser una imagen")); return; }
        if (file.size > MAX_IMAGE_BYTES) { reject(new Error("La imagen pesa más de 10MB")); return; }
      }

      var formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);

      var xhr = new XMLHttpRequest();
      xhr.open("POST", uploadUrlFor(resourceType), true);

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
            reject(new Error((res.error && res.error.message) || "Error al subir el archivo"));
          }
        } catch (e) {
          reject(new Error("Respuesta inválida de Cloudinary"));
        }
      };

      xhr.onerror = function () { reject(new Error("Error de red al subir el archivo")); };
      xhr.send(formData);
    });
  }

  /** Compatibilidad con el código existente (paquetes, actividades, libros, galería). */
  function uploadImage(file, onProgress) {
    return uploadMedia(file, "image", onProgress);
  }

  function uploadVideo(file, onProgress) {
    return uploadMedia(file, "video", onProgress);
  }

  window.huellaCloudinary = {
    uploadImage: uploadImage,
    uploadVideo: uploadVideo,
    uploadMedia: uploadMedia
  };
})();
