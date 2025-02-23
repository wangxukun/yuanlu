"use server";

export async function createUser(formData: FormData) {
  const rawFormData = {
    phone: formData.get("phone"),
    authCode: formData.get("authCode"),
  };
  console.log(rawFormData);
}
