import Joi from "joi";

export const markAttendanceSchema = Joi.object({
  employeeId: Joi.alternatives(Joi.string(), Joi.number()).required(),
  timestamp: Joi.string().isoDate().optional(),
  type: Joi.string().valid("check_in", "check_out").optional(),
  confidence: Joi.number().min(0).max(1).optional(),
  metadata: Joi.object().unknown(true).optional(),
});

export const batchMarkAttendanceSchema = Joi.object({
  items: Joi.array().items(markAttendanceSchema).min(1).required(),
});

export const dateRangeSchema = Joi.object({
  startDate: Joi.string().isoDate().required(),
  endDate: Joi.string().isoDate().required(),
  department: Joi.string().optional(),
  page: Joi.number().min(1).optional(),
  limit: Joi.number().min(1).max(10000).optional(),
});

export const attendanceCorrectionSchema = Joi.object({
  action: Joi.string().valid("update", "delete").required(),
  reason: Joi.string().max(500).optional(),
});

export function validateAttendance(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.method === "GET" ? req.query : req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.details.map((d) => d.message),
      });
    }
    if (req.method === "GET") req.query = value;
    else req.body = value;
    return next();
  };
}

