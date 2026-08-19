/**
 * Dispara el despliegue de GitHub Pages cuando cambia el Google Doc.
 *
 * Configura las propiedades del proyecto en Apps Script:
 * - DOC_ID: ID del documento de Google Docs.
 * - GITHUB_OWNER: iprojas
 * - GITHUB_REPO: fantasma
 * - GITHUB_TOKEN: fine-grained PAT con acceso Actions: Read and write.
 * - GITHUB_REF: main (opcional).
 */
var QUIET_PERIOD_MS = 90 * 1000;
var TRIGGER_FUNCTION = "checkDocumentForUpdate";

function install() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var index = 0; index < triggers.length; index += 1) {
    var trigger = triggers[index];
    if (trigger.getHandlerFunction() === TRIGGER_FUNCTION) {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  ScriptApp.newTrigger(TRIGGER_FUNCTION).timeBased().everyMinutes(1).create();
}

function checkDocumentForUpdate() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;

  try {
    var config = getConfig();
    var properties = PropertiesService.getScriptProperties();
    var modifiedAt = DriveApp.getFileById(config.docId).getLastUpdated().getTime();
    var deployedAt = Number(properties.getProperty("LAST_DEPLOYED_MODIFIED") || 0);

    if (modifiedAt <= deployedAt) {
      clearPending(properties);
      return;
    }

    var pendingModifiedAt = Number(properties.getProperty("PENDING_MODIFIED") || 0);
    var now = Date.now();

    // Mientras el documento sigue cambiando, reinicia la espera. Esto evita
    // desplegar versiones intermedias durante una sesión de escritura.
    if (pendingModifiedAt !== modifiedAt) {
      properties.setProperties({
        PENDING_MODIFIED: String(modifiedAt),
        PENDING_SINCE: String(now)
      });
      return;
    }

    var pendingSince = Number(properties.getProperty("PENDING_SINCE") || now);
    if (now - pendingSince < QUIET_PERIOD_MS) return;

    dispatchWorkflow(config);
    properties.setProperty("LAST_DEPLOYED_MODIFIED", String(modifiedAt));
    clearPending(properties);
  } finally {
    lock.releaseLock();
  }
}

function testConfiguration() {
  var config = getConfig();
  var response = UrlFetchApp.fetch(
    "https://api.github.com/repos/" + config.owner + "/" + config.repo,
    githubOptions(config, "get")
  );
  Logger.log("Conexion con GitHub correcta: " + response.getResponseCode());
}

function dispatchWorkflow(config) {
  var url = "https://api.github.com/repos/" + config.owner + "/" + config.repo +
    "/actions/workflows/pages.yml/dispatches";
  var response = UrlFetchApp.fetch(
    url,
    githubOptions(config, "post", { ref: config.ref })
  );

  if (response.getResponseCode() !== 204) {
    throw new Error(
      "GitHub no acepto el despliegue (" + response.getResponseCode() + "): " +
        response.getContentText()
    );
  }
}

function githubOptions(config, method, payload) {
  var options = {
    method: method,
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + config.token,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    muteHttpExceptions: true
  };
  if (payload) options.payload = JSON.stringify(payload);
  return options;
}

function getConfig() {
  var properties = PropertiesService.getScriptProperties();
  var config = {
    docId: properties.getProperty("DOC_ID"),
    owner: properties.getProperty("GITHUB_OWNER"),
    repo: properties.getProperty("GITHUB_REPO"),
    token: properties.getProperty("GITHUB_TOKEN"),
    ref: properties.getProperty("GITHUB_REF") || "main"
  };

  for (var name in config) {
    if (!config[name]) throw new Error("Falta configurar la propiedad " + name + ".");
  }
  return config;
}

function clearPending(properties) {
  properties.deleteProperty("PENDING_MODIFIED");
  properties.deleteProperty("PENDING_SINCE");
}
