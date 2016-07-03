exports.config = {
  agent_enabled: "NEW_RELIC_LICENSE_KEY" in process.env,
  capture_params: true,
  apdex_t: 0.250,
  error_collector: {
    // We need to disable the error collector to let Opbeat retrieve the stacktrace on uncaughtException
    enabled: false,

    // We ignore common 4XX errors. By default they trigger alarms on newrelic, but on a REST API they're pretty standard and should not be considered errors.
    ignore_status_codes: [401, 403, 404, 405, 409, 410, 413, 429],
  }
};
