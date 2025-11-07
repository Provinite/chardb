variable "queue_name" {
  description = "Name of the SQS queue"
  type        = string
}

variable "visibility_timeout" {
  description = "Visibility timeout in seconds"
  type        = number
  default     = 30
}

variable "message_retention" {
  description = "Message retention period in seconds (default 4 days)"
  type        = number
  default     = 345600 # 4 days
}

variable "max_message_size" {
  description = "Maximum message size in bytes"
  type        = number
  default     = 262144 # 256 KB
}

variable "receive_wait_time" {
  description = "Wait time for ReceiveMessage calls in seconds (0-20). Long polling (5-20s) reduces API calls and costs."
  type        = number
  default     = 5
}

variable "max_receive_count" {
  description = "Maximum number of times a message can be received before being sent to DLQ"
  type        = number
  default     = 3
}

variable "dlq_message_retention" {
  description = "Message retention period for DLQ in seconds (default 14 days)"
  type        = number
  default     = 1209600 # 14 days
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
