import mongoose from "mongoose";

function redactSecrets(value: string): string {
  return value.replace(/\/\/[^/\s@]+:[^@\s]+@/g, "//<credentials>@");
}

function classifyMongoError(error: unknown): Error {
  const err = (error ?? {}) as Record<string, unknown>;
  const name = String(err.name ?? "");
  const code = err.code ?? (err.cause as Record<string, unknown> | undefined)?.code;
  const codeName = String(err.codeName ?? "");
  const rawMessage = String(err.message ?? error);
  const message = redactSecrets(rawMessage);

  const isDns =
    /querySrv|getaddrinfo|ENOTFOUND|EAI_AGAIN/i.test(rawMessage) ||
    code === "ENOTFOUND" ||
    code === "EAI_AGAIN" ||
    (code === "ECONNREFUSED" && /querySrv/i.test(rawMessage));

  const isAuth =
    code === 18 ||
    code === 8000 ||
    /Authentication failed|bad auth|not authorized|Unauthorized/i.test(rawMessage) ||
    /AuthenticationFailed/i.test(codeName);

  const isTls = /tls|ssl|certificate|CERT_/i.test(rawMessage);

  const isNetwork =
    /MongoNetworkError|MongoServerSelectionError|MongoTimeoutError/i.test(name) ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "ECONNRESET" ||
    code === "ENETUNREACH" ||
    /timed out|ECONNREFUSED|ECONNRESET/i.test(rawMessage);

  let classifiedMessage = `MongoDB connection failed: ${message}`;

  if (isDns) {
    classifiedMessage =
      "MongoDB connection failed: DNS resolution error. " +
      "Node could not resolve the MongoDB SRV/A record using the current DNS resolver. " +
      "Use a standard mongodb:// connection string from Atlas, or configure DNS. " +
      `Details: ${message}`;
  } else if (isAuth) {
    classifiedMessage =
      "MongoDB connection failed: authentication error. " +
      "Check the database username and password in MONGODB_URI. " +
      `Details: ${message}`;
  } else if (isTls) {
    classifiedMessage =
      "MongoDB connection failed: TLS/SSL error. " +
      "Ensure TLS remains enabled and Atlas certificates are trusted. " +
      `Details: ${message}`;
  } else if (isNetwork) {
    classifiedMessage =
      "MongoDB connection failed: network error. " +
      "Check internet access, firewall, VPN, and Atlas Network Access. " +
      `Details: ${message}`;
  }

  const classified = new Error(classifiedMessage);
  (classified as { cause?: unknown }).cause = error;
  return classified;
}

let connectionPromise: Promise<typeof mongoose> | null = null;

mongoose.connection.on("error", () => {
  console.error("MongoDB connection error. Check database configuration and connectivity.");
});

const connectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState === 1) return;
  if (!connectionPromise) {
    const mongoUri = process.env.MONGODB_URI?.trim();
    if (!mongoUri) throw new Error("MONGODB_URI is not defined in the server environment.");
    if (!/^mongodb(\+srv)?:\/\//i.test(mongoUri)) throw new Error("MONGODB_URI has an invalid scheme.");
    connectionPromise = mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 }).catch(error => {
      connectionPromise = null;
      throw classifyMongoError(error);
    });
  }
  await connectionPromise;
};

export default connectDB;
