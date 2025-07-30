export interface AdminFields {
  email: string;
  first_name: string;
  last_name: string;
  user_status: string;
  [key: string]: any;
}

export interface Admin {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userStatus: string;
}
