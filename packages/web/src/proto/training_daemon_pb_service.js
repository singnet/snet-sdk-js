// package: training
// file: training_daemon.proto

var training_daemon_pb = require("./training_daemon_pb");
var training_pb = require("./training_pb");
var google_protobuf_empty_pb = require("google-protobuf/google/protobuf/empty_pb");
var grpc = require("@improbable-eng/grpc-web").grpc;

var Daemon = (function () {
  function Daemon() {}
  Daemon.serviceName = "training.Daemon";
  return Daemon;
}());

Daemon.create_model = {
  methodName: "create_model",
  service: Daemon,
  requestStream: false,
  responseStream: false,
  requestType: training_daemon_pb.NewModelRequest,
  responseType: training_pb.ModelResponse
};

Daemon.validate_model_price = {
  methodName: "validate_model_price",
  service: Daemon,
  requestStream: false,
  responseStream: false,
  requestType: training_daemon_pb.AuthValidateRequest,
  responseType: training_pb.PriceInBaseUnit
};

Daemon.upload_and_validate = {
  methodName: "upload_and_validate",
  service: Daemon,
  requestStream: true,
  responseStream: false,
  requestType: training_daemon_pb.UploadAndValidateRequest,
  responseType: training_pb.StatusResponse
};

Daemon.validate_model = {
  methodName: "validate_model",
  service: Daemon,
  requestStream: false,
  responseStream: false,
  requestType: training_daemon_pb.AuthValidateRequest,
  responseType: training_pb.StatusResponse
};

Daemon.train_model_price = {
  methodName: "train_model_price",
  service: Daemon,
  requestStream: false,
  responseStream: false,
  requestType: training_daemon_pb.CommonRequest,
  responseType: training_pb.PriceInBaseUnit
};

Daemon.train_model = {
  methodName: "train_model",
  service: Daemon,
  requestStream: false,
  responseStream: false,
  requestType: training_daemon_pb.CommonRequest,
  responseType: training_pb.StatusResponse
};

Daemon.delete_model = {
  methodName: "delete_model",
  service: Daemon,
  requestStream: false,
  responseStream: false,
  requestType: training_daemon_pb.CommonRequest,
  responseType: training_pb.StatusResponse
};

Daemon.get_all_models = {
  methodName: "get_all_models",
  service: Daemon,
  requestStream: false,
  responseStream: false,
  requestType: training_daemon_pb.AllModelsRequest,
  responseType: training_daemon_pb.ModelsResponse
};

Daemon.get_model = {
  methodName: "get_model",
  service: Daemon,
  requestStream: false,
  responseStream: false,
  requestType: training_daemon_pb.CommonRequest,
  responseType: training_pb.ModelResponse
};

Daemon.update_model = {
  methodName: "update_model",
  service: Daemon,
  requestStream: false,
  responseStream: false,
  requestType: training_daemon_pb.UpdateModelRequest,
  responseType: training_pb.ModelResponse
};

Daemon.get_training_metadata = {
  methodName: "get_training_metadata",
  service: Daemon,
  requestStream: false,
  responseStream: false,
  requestType: google_protobuf_empty_pb.Empty,
  responseType: training_daemon_pb.TrainingMetadata
};

Daemon.get_method_metadata = {
  methodName: "get_method_metadata",
  service: Daemon,
  requestStream: false,
  responseStream: false,
  requestType: training_daemon_pb.MethodMetadataRequest,
  responseType: training_daemon_pb.MethodMetadata
};

exports.Daemon = Daemon;

function DaemonClient(serviceHost, options) {
  this.serviceHost = serviceHost;
  this.options = options || {};
}

DaemonClient.prototype.create_model = function create_model(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(Daemon.create_model, {
    request: requestMessage,
    host: this.serviceHost,
    metadata: metadata,
    transport: this.options.transport,
    debug: this.options.debug,
    onEnd: function (response) {
      if (callback) {
        if (response.status !== grpc.Code.OK) {
          var err = new Error(response.statusMessage);
          err.code = response.status;
          err.metadata = response.trailers;
          callback(err, null);
        } else {
          callback(null, response.message);
        }
      }
    }
  });
  return {
    cancel: function () {
      callback = null;
      client.close();
    }
  };
};

DaemonClient.prototype.validate_model_price = function validate_model_price(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(Daemon.validate_model_price, {
    request: requestMessage,
    host: this.serviceHost,
    metadata: metadata,
    transport: this.options.transport,
    debug: this.options.debug,
    onEnd: function (response) {
      if (callback) {
        if (response.status !== grpc.Code.OK) {
          var err = new Error(response.statusMessage);
          err.code = response.status;
          err.metadata = response.trailers;
          callback(err, null);
        } else {
          callback(null, response.message);
        }
      }
    }
  });
  return {
    cancel: function () {
      callback = null;
      client.close();
    }
  };
};

DaemonClient.prototype.upload_and_validate = function upload_and_validate(metadata) {
  var listeners = {
    end: [],
    status: []
  };
  var client = grpc.client(Daemon.upload_and_validate, {
    host: this.serviceHost,
    metadata: metadata,
    transport: this.options.transport
  });
  client.onEnd(function (status, statusMessage, trailers) {
    listeners.status.forEach(function (handler) {
      handler({ code: status, details: statusMessage, metadata: trailers });
    });
    listeners.end.forEach(function (handler) {
      handler({ code: status, details: statusMessage, metadata: trailers });
    });
    listeners = null;
  });
  return {
    on: function (type, handler) {
      listeners[type].push(handler);
      return this;
    },
    write: function (requestMessage) {
      if (!client.started) {
        client.start(metadata);
      }
      client.send(requestMessage);
      return this;
    },
    end: function () {
      client.finishSend();
    },
    cancel: function () {
      listeners = null;
      client.close();
    }
  };
};

DaemonClient.prototype.validate_model = function validate_model(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(Daemon.validate_model, {
    request: requestMessage,
    host: this.serviceHost,
    metadata: metadata,
    transport: this.options.transport,
    debug: this.options.debug,
    onEnd: function (response) {
      if (callback) {
        if (response.status !== grpc.Code.OK) {
          var err = new Error(response.statusMessage);
          err.code = response.status;
          err.metadata = response.trailers;
          callback(err, null);
        } else {
          callback(null, response.message);
        }
      }
    }
  });
  return {
    cancel: function () {
      callback = null;
      client.close();
    }
  };
};

DaemonClient.prototype.train_model_price = function train_model_price(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(Daemon.train_model_price, {
    request: requestMessage,
    host: this.serviceHost,
    metadata: metadata,
    transport: this.options.transport,
    debug: this.options.debug,
    onEnd: function (response) {
      if (callback) {
        if (response.status !== grpc.Code.OK) {
          var err = new Error(response.statusMessage);
          err.code = response.status;
          err.metadata = response.trailers;
          callback(err, null);
        } else {
          callback(null, response.message);
        }
      }
    }
  });
  return {
    cancel: function () {
      callback = null;
      client.close();
    }
  };
};

DaemonClient.prototype.train_model = function train_model(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(Daemon.train_model, {
    request: requestMessage,
    host: this.serviceHost,
    metadata: metadata,
    transport: this.options.transport,
    debug: this.options.debug,
    onEnd: function (response) {
      if (callback) {
        if (response.status !== grpc.Code.OK) {
          var err = new Error(response.statusMessage);
          err.code = response.status;
          err.metadata = response.trailers;
          callback(err, null);
        } else {
          callback(null, response.message);
        }
      }
    }
  });
  return {
    cancel: function () {
      callback = null;
      client.close();
    }
  };
};

DaemonClient.prototype.delete_model = function delete_model(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(Daemon.delete_model, {
    request: requestMessage,
    host: this.serviceHost,
    metadata: metadata,
    transport: this.options.transport,
    debug: this.options.debug,
    onEnd: function (response) {
      if (callback) {
        if (response.status !== grpc.Code.OK) {
          var err = new Error(response.statusMessage);
          err.code = response.status;
          err.metadata = response.trailers;
          callback(err, null);
        } else {
          callback(null, response.message);
        }
      }
    }
  });
  return {
    cancel: function () {
      callback = null;
      client.close();
    }
  };
};

DaemonClient.prototype.get_all_models = function get_all_models(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(Daemon.get_all_models, {
    request: requestMessage,
    host: this.serviceHost,
    metadata: metadata,
    transport: this.options.transport,
    debug: this.options.debug,
    onEnd: function (response) {
      if (callback) {
        if (response.status !== grpc.Code.OK) {
          var err = new Error(response.statusMessage);
          err.code = response.status;
          err.metadata = response.trailers;
          callback(err, null);
        } else {
          callback(null, response.message);
        }
      }
    }
  });
  return {
    cancel: function () {
      callback = null;
      client.close();
    }
  };
};

DaemonClient.prototype.get_model = function get_model(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(Daemon.get_model, {
    request: requestMessage,
    host: this.serviceHost,
    metadata: metadata,
    transport: this.options.transport,
    debug: this.options.debug,
    onEnd: function (response) {
      if (callback) {
        if (response.status !== grpc.Code.OK) {
          var err = new Error(response.statusMessage);
          err.code = response.status;
          err.metadata = response.trailers;
          callback(err, null);
        } else {
          callback(null, response.message);
        }
      }
    }
  });
  return {
    cancel: function () {
      callback = null;
      client.close();
    }
  };
};

DaemonClient.prototype.update_model = function update_model(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(Daemon.update_model, {
    request: requestMessage,
    host: this.serviceHost,
    metadata: metadata,
    transport: this.options.transport,
    debug: this.options.debug,
    onEnd: function (response) {
      if (callback) {
        if (response.status !== grpc.Code.OK) {
          var err = new Error(response.statusMessage);
          err.code = response.status;
          err.metadata = response.trailers;
          callback(err, null);
        } else {
          callback(null, response.message);
        }
      }
    }
  });
  return {
    cancel: function () {
      callback = null;
      client.close();
    }
  };
};

DaemonClient.prototype.get_training_metadata = function get_training_metadata(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(Daemon.get_training_metadata, {
    request: requestMessage,
    host: this.serviceHost,
    metadata: metadata,
    transport: this.options.transport,
    debug: this.options.debug,
    onEnd: function (response) {
      if (callback) {
        if (response.status !== grpc.Code.OK) {
          var err = new Error(response.statusMessage);
          err.code = response.status;
          err.metadata = response.trailers;
          callback(err, null);
        } else {
          callback(null, response.message);
        }
      }
    }
  });
  return {
    cancel: function () {
      callback = null;
      client.close();
    }
  };
};

DaemonClient.prototype.get_method_metadata = function get_method_metadata(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(Daemon.get_method_metadata, {
    request: requestMessage,
    host: this.serviceHost,
    metadata: metadata,
    transport: this.options.transport,
    debug: this.options.debug,
    onEnd: function (response) {
      if (callback) {
        if (response.status !== grpc.Code.OK) {
          var err = new Error(response.statusMessage);
          err.code = response.status;
          err.metadata = response.trailers;
          callback(err, null);
        } else {
          callback(null, response.message);
        }
      }
    }
  });
  return {
    cancel: function () {
      callback = null;
      client.close();
    }
  };
};

exports.DaemonClient = DaemonClient;

