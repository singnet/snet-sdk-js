// package: training
// file: training.proto

var training_pb = require("./training_pb");
var grpc = require("@improbable-eng/grpc-web").grpc;

var Model = (function () {
  function Model() {}
  Model.serviceName = "training.Model";
  return Model;
}());

Model.create_model = {
  methodName: "create_model",
  service: Model,
  requestStream: false,
  responseStream: false,
  requestType: training_pb.NewModel,
  responseType: training_pb.ModelID
};

Model.validate_model_price = {
  methodName: "validate_model_price",
  service: Model,
  requestStream: false,
  responseStream: false,
  requestType: training_pb.ValidateRequest,
  responseType: training_pb.PriceInBaseUnit
};

Model.upload_and_validate = {
  methodName: "upload_and_validate",
  service: Model,
  requestStream: true,
  responseStream: false,
  requestType: training_pb.UploadInput,
  responseType: training_pb.StatusResponse
};

Model.validate_model = {
  methodName: "validate_model",
  service: Model,
  requestStream: false,
  responseStream: false,
  requestType: training_pb.ValidateRequest,
  responseType: training_pb.StatusResponse
};

Model.train_model_price = {
  methodName: "train_model_price",
  service: Model,
  requestStream: false,
  responseStream: false,
  requestType: training_pb.ModelID,
  responseType: training_pb.PriceInBaseUnit
};

Model.train_model = {
  methodName: "train_model",
  service: Model,
  requestStream: false,
  responseStream: false,
  requestType: training_pb.ModelID,
  responseType: training_pb.StatusResponse
};

Model.delete_model = {
  methodName: "delete_model",
  service: Model,
  requestStream: false,
  responseStream: false,
  requestType: training_pb.ModelID,
  responseType: training_pb.StatusResponse
};

Model.get_model_status = {
  methodName: "get_model_status",
  service: Model,
  requestStream: false,
  responseStream: false,
  requestType: training_pb.ModelID,
  responseType: training_pb.StatusResponse
};

exports.Model = Model;

function ModelClient(serviceHost, options) {
  this.serviceHost = serviceHost;
  this.options = options || {};
}

ModelClient.prototype.create_model = function create_model(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(Model.create_model, {
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

ModelClient.prototype.validate_model_price = function validate_model_price(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(Model.validate_model_price, {
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

ModelClient.prototype.upload_and_validate = function upload_and_validate(metadata) {
  var listeners = {
    end: [],
    status: []
  };
  var client = grpc.client(Model.upload_and_validate, {
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

ModelClient.prototype.validate_model = function validate_model(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(Model.validate_model, {
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

ModelClient.prototype.train_model_price = function train_model_price(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(Model.train_model_price, {
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

ModelClient.prototype.train_model = function train_model(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(Model.train_model, {
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

ModelClient.prototype.delete_model = function delete_model(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(Model.delete_model, {
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

ModelClient.prototype.get_model_status = function get_model_status(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(Model.get_model_status, {
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

exports.ModelClient = ModelClient;

