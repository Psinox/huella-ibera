(function () {
  "use strict";

  var CLOUD_NAME = "dmdpzjwom";
  var UPLOAD_PRESET = "huella_unsigned";

  var MAX_IMAGE_BYTES = 10 * 1024 * 1024;
  var MAX_VIDEO_BYTES = 100 * 1024 * 1024;

  var MAX_DIMENSION = 1200;
  var WEBP_QUALITY = 0.8;

  function uploadUrlFor(resourceType) {
    return "https://api.cloudinary.com/v1_1/" + CLOUD_NAME + "/" + resourceType + "/upload";
  }

  /**
   * Comprime imagen via Canvas nativo.
   * Redimensiona proporcionalmente al lado más largo de 1200px.
   * Exporta como WebP al 80% de calidad.
   * @param {File} file
   * @returns {Promise<File>}
   */
  function comprimirImagen(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          var w = img.width;
          var h = img.height;
          var ladoLargo = Math.max(w, h);

          if (ladoLargo <= MAX_DIMENSION) {
            resolve(file);
            return;
          }

          var escala = MAX_DIMENSION / ladoLargo;
          var canvasW = Math.round(w * escala);
          var canvasH = Math.round(h * escala);

          var canvas = document.createElement("canvas");
          canvas.width = canvasW;
          canvas.height = canvasH;

          var ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvasW, canvasH);

          canvas.toBlob(
            function (blob) {
              if (!blob) { resolve(file); return; }
              var compressed = new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), {
                type: "image/webp",
                lastModified: Date.now()
              });
              resolve(compressed);
            },
            "image/webp",
            WEBP_QUALITY
          );
        };
        img.onerror = function () { resolve(file); };
        img.src = e.target.result;
      };
      reader.onerror = function () { resolve(file); };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Inyecta /upload/f_auto,q_auto/ en la URL de Cloudinary para optimización CDN.
   * @param {string} url
   * @returns {string}
   */
  function optimizarUrl(url) {
    return url.replace("/upload/", "/upload/f_auto,q_auto/");
  }

  /**
   * Sube un archivo (imagen o video) a Cloudinary.
   * Las imágenes se comprimen automáticamente antes del envío.
   * @param {File} file
   * @param {string} resourceType "image" | "video"
   * @param {function(number):void} [onProgress] 0-100
   * @returns {Promise<string>} URL optimizada del archivo subido
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

      var uploadFile = file;

      if (resourceType === "image") {
        comprimirImagen(file).then(function (compressed) {
          uploadFile = compressed;
          enviar(uploadFile);
        });
      } else {
        enviar(file);
      }

      function enviar(archivo) {
        var formData = new FormData();
        formData.append("file", archivo);
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
              resolve(optimizarUrl(res.secure_url));
            } else {
              reject(new Error((res.error && res.error.message) || "Error al subir el archivo"));
            }
          } catch (e) {
            reject(new Error("Respuesta inválida de Cloudinary"));
          }
        };

        xhr.onerror = function () { reject(new Error("Error de red al subir el archivo")); };
        xhr.send(formData);
      }
    });
  }

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
