/*
    Database calling common function 
*/

const asyncHandler = (requestHandler) => {
  (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

// 1.   const asyncHandler = ()=> {}
// 2. const asyncHandler = (func)=>{}
//3. const asyncHandler = (func)=> async()=>{}

// try catch code

// const asyncHandler = (func) => async (req, res, next) => {
//   try {
//     await func(req, res, next);
//   } catch (err) {
//     res.status(err.code || 500).json({
//       succes: false,
//       message: err.message || "Internal Server Error",
//     });
//   }
// };

export { asyncHandler };
