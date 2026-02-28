import Joi from "joi";

export const createEmployeeSchema = Joi.object({
  name: Joi.string().min(1).required(),
  email: Joi.string().email().required(),
  employeeId: Joi.string().min(1).required(),
  department: Joi.string().optional(),
  position: Joi.string().optional(),
  hireDate: Joi.string().isoDate().required(),
  status: Joi.string().valid("active", "inactive", "on-leave").optional(),
  metadata: Joi.object().unknown(true).optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.fork(
  ["name", "email", "employeeId", "hireDate"],
  (s) => s.optional()
);

export const bulkImportSchema = Joi.object({
  rows: Joi.array().items(createEmployeeSchema).min(1).required(),
});

export const employeeSearchSchema = Joi.object({
  query: Joi.string().min(1).required(),
  fields: Joi.array().items(Joi.string().valid("name", "email", "employeeId")).optional(),
});

export function validateEmployee(schema) {
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

