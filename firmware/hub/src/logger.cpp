#include "logger.h"
#include <stdarg.h>
#include <stdio.h>

static const char* level_str(LogLevel level) {
  switch (level) {
    case LogLevel::DEBUG: return "DEBUG";
    case LogLevel::INFO:  return "INFO ";
    case LogLevel::WARN:  return "WARN ";
    case LogLevel::ERROR: return "ERROR";
    default:              return "?????";
  }
}

void logger_init(uint32_t baud) {
  Serial.begin(baud);
  delay(100);
}

void log_msg(LogLevel level, const char* module, const char* fmt, ...) {
  char msgBuf[256];
  va_list args;
  va_start(args, fmt);
  vsnprintf(msgBuf, sizeof(msgBuf), fmt, args);
  va_end(args);

  Serial.printf("[%10lu] [%s] [%-10s] %s\n",
                millis(), level_str(level), module, msgBuf);
}
