#pragma once
#include <Arduino.h>

// =============================================================================
// Structured Serial Logger
// Format: [TIMESTAMP] [LEVEL] [MODULE] message
// =============================================================================

enum class LogLevel { DEBUG, INFO, WARN, ERROR };

void logger_init(uint32_t baud = 115200);

void log_msg(LogLevel level, const char* module, const char* fmt, ...);

#define LOG_DEBUG(module, fmt, ...) log_msg(LogLevel::DEBUG, module, fmt, ##__VA_ARGS__)
#define LOG_INFO(module, fmt, ...)  log_msg(LogLevel::INFO,  module, fmt, ##__VA_ARGS__)
#define LOG_WARN(module, fmt, ...)  log_msg(LogLevel::WARN,  module, fmt, ##__VA_ARGS__)
#define LOG_ERROR(module, fmt, ...) log_msg(LogLevel::ERROR, module, fmt, ##__VA_ARGS__)
