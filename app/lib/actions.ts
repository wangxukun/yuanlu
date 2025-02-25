"use server";

export async function createUser(formData: FormData) {
  const rawFormData = {
    phone: formData.get("phone"),
    authCode: formData.get("sms-code"),
  };
  console.log(rawFormData);
}
export async function login(formData: FormData) {
  const rawFormData = {
    phone: formData.get("phone"),
    authCode: formData.get("password"),
  };
  console.log(rawFormData);
}
